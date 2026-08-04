# API gateway — Nginx reverse proxy (Azure Container Apps ready)
# Build for Azure:
#   docker build --platform linux/amd64 -t api-gateway .
FROM nginx:1.27-alpine

RUN apk add --no-cache gettext \
    && rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
