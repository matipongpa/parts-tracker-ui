# Stage 1: build the static bundle. VITE_API_URL is baked in at build time, so it is a relative
# path: the nginx below proxies /api to the backend, which keeps the UI and API on one origin
# (no CORS, and the httpOnly refresh cookie stays first-party).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: serve it.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
