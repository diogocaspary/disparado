#!/bin/sh
set -e

echo "[entrypoint] Aguardando o banco de dados ficar disponível..."

MAX_RETRIES=30
RETRY_DELAY=2
attempt=1

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$MAX_RETRIES" ]; then
    echo "[entrypoint] Não foi possível conectar ao banco de dados após $MAX_RETRIES tentativas. Abortando."
    exit 1
  fi
  echo "[entrypoint] Banco de dados indisponível (tentativa $attempt/$MAX_RETRIES). Tentando novamente em ${RETRY_DELAY}s..."
  attempt=$((attempt + 1))
  sleep "$RETRY_DELAY"
done

echo "[entrypoint] Migrations aplicadas com sucesso."

echo "[entrypoint] Rodando seed do usuário SUPER_ADMIN (idempotente)..."
npx tsx prisma/seed.ts

echo "[entrypoint] Iniciando aplicação..."
exec node dist/index.js
