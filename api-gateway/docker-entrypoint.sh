#!/bin/sh
set -eu

# Defaults target your Azure Container Apps (override via env on deploy).
: "${AUTH_UPSTREAM:=https://auth-service.calmdesert-828f8d96.uaenorth.azurecontainerapps.io}"
: "${VIDEO_UPSTREAM:=https://video-service-1.calmdesert-828f8d96.uaenorth.azurecontainerapps.io}"

# Host headers must match the upstream hostname (ACA rejects mismatched Host).
auth_no_scheme="${AUTH_UPSTREAM#*://}"
AUTH_HOST="${AUTH_HOST:-${auth_no_scheme%%/*}}"

video_no_scheme="${VIDEO_UPSTREAM#*://}"
VIDEO_HOST="${VIDEO_HOST:-${video_no_scheme%%/*}}"

# Strip trailing slashes so proxy_pass paths stay predictable.
AUTH_UPSTREAM="${AUTH_UPSTREAM%/}"
VIDEO_UPSTREAM="${VIDEO_UPSTREAM%/}"

export AUTH_UPSTREAM AUTH_HOST VIDEO_UPSTREAM VIDEO_HOST

echo "[api-gateway] AUTH_UPSTREAM=${AUTH_UPSTREAM} AUTH_HOST=${AUTH_HOST}"
echo "[api-gateway] VIDEO_UPSTREAM=${VIDEO_UPSTREAM} VIDEO_HOST=${VIDEO_HOST}"

envsubst '${AUTH_UPSTREAM} ${AUTH_HOST} ${VIDEO_UPSTREAM} ${VIDEO_HOST}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

nginx -t
exec nginx -g "daemon off;"
