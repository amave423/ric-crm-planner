FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_API_BASE=
ARG VITE_USE_MOCK=false
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_USE_MOCK=$VITE_USE_MOCK

COPY . .
RUN npm run build

FROM caddy:2.8-alpine

COPY --from=build /app/dist /srv/front
COPY Caddyfile /etc/caddy/Caddyfile
