#!/usr/bin/env bash
set -Eeuo pipefail
# shellcheck disable=SC1091
source /opt/oxygen/stack.env
readonly timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
readonly output="/tmp/oxygen-${timestamp}.dump"
trap 'rm -f "$output"' EXIT
docker exec oxygen-postgres pg_dump -U oxygen -d oxygen -Fc > "$output"
aws s3 cp "$output" "s3://${OXYGEN_BACKUP_BUCKET}/postgres/${timestamp}.dump" \
  --region "$AWS_REGION" --only-show-errors
echo "Backup uploaded: postgres/${timestamp}.dump"
