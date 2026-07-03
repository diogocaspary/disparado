# syntax=docker/dockerfile:1

# ---------- Etapa 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências (inclui devDependencies, necessárias para compilar TS e gerar o Prisma Client)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o restante do código-fonte
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Gera o Prisma Client e compila o TypeScript
RUN npx prisma generate
RUN npm run build

# ---------- Etapa 2: runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Instala apenas dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# tsx é necessário em runtime apenas para executar o seed (prisma/seed.ts) sem
# precisar compilá-lo separadamente (ele não faz parte do rootDir "src" do tsconfig).
RUN npm install --no-save tsx

# Copia artefatos já compilados e o necessário para rodar migrations/seed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["./docker-entrypoint.sh"]
