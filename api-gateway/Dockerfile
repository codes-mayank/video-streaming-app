# API gateway — Nginx reverse proxy
FROM nginx:1.27-alpine

# docker.conf uses in-network service hostnames (auth-service, video-service).
# For host-mapped local apps, mount nginx.conf instead (see docker-compose.yml).
COPY nginx.docker.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
