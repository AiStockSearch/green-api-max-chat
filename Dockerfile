# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_GREEN_API_SAME_ORIGIN_PROXY=true
ENV VITE_GREEN_API_SAME_ORIGIN_PROXY=${VITE_GREEN_API_SAME_ORIGIN_PROXY}

RUN npm run build

FROM nginx:alpine AS runtime

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health | grep -q ok || exit 1

CMD ["nginx", "-g", "daemon off;"]
