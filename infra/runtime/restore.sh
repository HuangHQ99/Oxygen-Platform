#!/usr/bin/env bash
set -Eeuo pipefail
if [[ $# -ne 1 || "$1" != s3://* ]]; then
  echo "Usage: sudo $0 s3://BUCKET/postgres/BACKUP.dump" >&2
  exit 2
fi
# shellcheck disable=SC1091
source /opt/oxygen/stack.env
readonly input=/tmp/oxygen-restore.dump
trap 'rm -f "$input"' EXIT
aws s3 cp "$1" "$input" --region "$AWS_REGION" --only-show-errors
echo "This replaces the pre-production database. Type RESTORE to continue:"
read -r confirmation
[[ "$confirmation" == RESTORE ]] || { echo "Restore cancelled"; exit 1; }
docker exec oxygen-postgres dropdb -U oxygen --if-exists oxygen
docker exec oxygen-postgres createdb -U oxygen oxygen
docker exec -i oxygen-postgres pg_restore -U oxygen -d oxygen --clean --if-exists < "$input"
echo "Database restored; restart the API to validate migrations."
