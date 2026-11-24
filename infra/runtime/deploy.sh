#!/usr/bin/env bash
set -Eeuo pipefail

readonly CONFIG=/opt/oxygen/stack.env
if [[ ! -r "$CONFIG" ]]; then
  echo "Missing runtime configuration: $CONFIG" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG"

image_tag="${1:-${OXYGEN_IMAGE_TAG:-stable}}"
readonly runtime_env=/opt/oxygen/runtime.env
readonly api_image="${OXYGEN_API_REPOSITORY}:${image_tag}"
readonly web_image="${OXYGEN_WEB_REPOSITORY}:${image_tag}"
oidc_client_id="$(aws cognito-idp list-user-pool-clients \
  --region "$AWS_REGION" \
  --user-pool-id "$OXYGEN_USER_POOL_ID" \
  --query "UserPoolClients[?ClientName=='oxygen-web'].ClientId | [0]" \
  --output text)"
if [[ -z "$oidc_client_id" || "$oidc_client_id" == None ]]; then
  echo "Cognito client oxygen-web was not found" >&2
  exit 1
fi

secret_json="$(aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$OXYGEN_DATABASE_SECRET_ARN" \
  --query SecretString \
  --output text)"
db_user="$(jq -r '.username' <<<"$secret_json")"
db_password="$(jq -r '.password' <<<"$secret_json")"
oidc_client_secret="$(aws cognito-idp describe-user-pool-client \
  --region "$AWS_REGION" \
  --user-pool-id "$OXYGEN_USER_POOL_ID" \
  --client-id "$oidc_client_id" \
  --query UserPoolClient.ClientSecret \
  --output text)"

umask 077
cat > "$runtime_env" <<EOF
OXYGEN_DB_USER=$db_user
OXYGEN_DB_PASSWORD=$db_password
OXYGEN_DB_URL=jdbc:postgresql://postgres:5432/oxygen
OXYGEN_ENVIRONMENT=preprod
OXYGEN_AUTH_MODE=oidc
OXYGEN_OIDC_CLIENT_ID=$oidc_client_id
OXYGEN_OIDC_CLIENT_SECRET=$oidc_client_secret
OXYGEN_OIDC_ISSUER_URI=https://cognito-idp.$AWS_REGION.amazonaws.com/$OXYGEN_USER_POOL_ID
SPRING_PROFILES_ACTIVE=oidc
EOF
unset secret_json oidc_client_secret

registry="${OXYGEN_API_REPOSITORY%%/*}"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$registry" >/dev/null
docker network inspect oxygen >/dev/null 2>&1 || docker network create oxygen >/dev/null

docker pull "$api_image"
docker pull "$web_image"
previous_api="$(docker inspect --format '{{.Config.Image}}' oxygen-api 2>/dev/null || true)"
previous_web="$(docker inspect --format '{{.Config.Image}}' oxygen-web 2>/dev/null || true)"

if ! docker inspect oxygen-postgres >/dev/null 2>&1; then
  docker run -d --name oxygen-postgres --restart unless-stopped \
    --network oxygen \
    --memory 256m \
    -e POSTGRES_DB=oxygen \
    -e POSTGRES_USER="$db_user" \
    -e POSTGRES_PASSWORD="$db_password" \
    -v /opt/oxygen/postgres:/var/lib/postgresql/data \
    postgres:17.7-alpine
else
  docker start oxygen-postgres >/dev/null || true
fi
unset db_password

for attempt in {1..30}; do
  if docker exec oxygen-postgres pg_isready -U "$db_user" -d oxygen >/dev/null 2>&1; then break; fi
  if [[ "$attempt" == 30 ]]; then echo "PostgreSQL did not become ready" >&2; exit 1; fi
  sleep 2
done

start_application() {
  local selected_api="$1" selected_web="$2"
  docker rm -f oxygen-api oxygen-web >/dev/null 2>&1 || true
  docker run -d --name oxygen-api --restart unless-stopped \
    --network oxygen --memory 512m --env-file "$runtime_env" \
    -p 127.0.0.1:8080:8080 "$selected_api" >/dev/null
  docker run -d --name oxygen-web --restart unless-stopped \
    --network oxygen --memory 64m -p 127.0.0.1:8081:8081 "$selected_web" >/dev/null
}

wait_for_readiness() {
  for attempt in {1..60}; do
    if curl --fail --silent http://127.0.0.1:8080/actuator/health/readiness >/dev/null; then return 0; fi
    sleep 3
  done
  return 1
}

start_application "$api_image" "$web_image"
if ! wait_for_readiness; then
  echo "New release failed readiness; restoring previous release" >&2
  if [[ -n "$previous_api" && -n "$previous_web" ]]; then
    start_application "$previous_api" "$previous_web"
    wait_for_readiness || true
  fi
  exit 1
fi

printf '%s\n' "$image_tag" > /opt/oxygen/current-release
docker image prune -f >/dev/null
echo "Oxygen release $image_tag is ready"
