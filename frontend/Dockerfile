# syntax=docker/dockerfile:1

# ---------- Etapa 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL é usada em build-time pelo Vite. Como o nginx faz proxy de
# /api para o backend, o padrão "/api" funciona sem precisar de CORS.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------- Etapa 2: runtime ----------
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Porta padrão do backend dentro da rede docker-compose (serviço "backend").
ENV BACKEND_URL=http://backend:3333

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
