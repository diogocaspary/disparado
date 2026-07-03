# Uneixo Broadcaster

Disparador de mensagens de utilidade do WhatsApp Business (Meta Cloud API), multi-tenant, com painel administrativo web. Permite que cada tenant configure suas próprias credenciais da Meta, faça upload de listas de contatos via CSV, monte templates de mensagem e dispare campanhas de notificação (ex: aviso de vencimento de fatura) para os contatos, com um dispatcher em processo (sem dependência de fila externa como Redis).

## Estrutura de pastas

```
uneixo-broadcaster/
├── backend/                 # API Node.js + TypeScript + Express + Prisma
│   ├── src/                 # código-fonte (rotas, middlewares, jobs/dispatcher)
│   ├── prisma/               # schema.prisma e seed.ts (cria o SUPER_ADMIN)
│   ├── Dockerfile
│   └── docker-entrypoint.sh # roda migrations + seed antes de iniciar a API
├── frontend/                 # Painel admin em React + TypeScript + Vite + Tailwind
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf.template  # serve o build estático + proxy /api -> backend
├── docker-compose.yml        # orquestra db + backend + frontend
├── .env.example               # variáveis de ambiente consolidadas
└── README.md
```

## Como rodar localmente

Pré-requisitos: Docker e Docker Compose instalados.

1. Copie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` e ajuste ao menos:
   - `POSTGRES_PASSWORD` — senha do banco
   - `JWT_SECRET` — segredo longo e aleatório (ex: `openssl rand -base64 48`)
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credenciais do super admin inicial

3. Suba os containers:

   ```bash
   docker compose up -d --build
   ```

4. Aguarde a inicialização. No primeiro start, o backend automaticamente:
   - espera o Postgres ficar disponível (retry com backoff);
   - roda `prisma migrate deploy` (aplica as migrations);
   - roda o seed que cria o usuário `SUPER_ADMIN` (idempotente — não duplica se já existir).

5. Acesse o painel em `http://localhost:8080` (ou a porta definida em `FRONTEND_HOST_PORT`) e faça login com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

A API fica acessível diretamente (opcional, para depuração) em `http://localhost:3333` (ou a porta definida em `BACKEND_HOST_PORT`), mas o frontend já se comunica com ela internamente via proxy do nginx em `/api`, então isso não é necessário para o uso normal.

## Variáveis de ambiente

Todas as variáveis usadas pelo `docker-compose.yml` estão documentadas com comentários em `.env.example`. Resumo:

| Variável | Descrição |
|---|---|
| `POSTGRES_USER` | Usuário do Postgres |
| `POSTGRES_PASSWORD` | Senha do Postgres |
| `POSTGRES_DB` | Nome do banco de dados |
| `JWT_SECRET` | Segredo para assinar tokens JWT |
| `SEED_ADMIN_EMAIL` | E-mail do super admin criado no primeiro deploy |
| `SEED_ADMIN_PASSWORD` | Senha do super admin criado no primeiro deploy |
| `BACKEND_PORT` | Porta interna do processo Node do backend (padrão 3333) |
| `BACKEND_HOST_PORT` | Porta do host mapeada para a API (acesso direto opcional) |
| `VITE_API_URL` | URL da API usada em build-time pelo frontend (padrão `/api`) |
| `FRONTEND_HOST_PORT` | Porta do host mapeada para o nginx do frontend (padrão 8080) |

## Deploy via GitHub + EasyPanel

### a) Criar o repositório no GitHub e enviar o projeto

```bash
git init
git add .
git commit -m "Deploy inicial do Uneixo Broadcaster"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/uneixo-broadcaster.git
git push -u origin main
```

> Confira que o `.gitignore` está evitando o envio de `node_modules/`, `dist/` e principalmente do arquivo `.env` (segredos nunca devem ir para o repositório).

### b) Criar o app no EasyPanel

1. No painel do EasyPanel, crie um novo **Project**.
2. Dentro do projeto, adicione um novo **App** do tipo **Docker Compose** (ou "Compose Service", dependendo da versão do EasyPanel).
3. Aponte a fonte para o repositório GitHub criado no passo anterior, branch `main`. Se o repositório for privado, autorize o acesso do EasyPanel à sua conta GitHub (via GitHub App/token) quando solicitado.
4. Informe o caminho do `docker-compose.yml` (raiz do repositório).

### c) Configurar variáveis de ambiente

Na interface do EasyPanel, na aba de **Environment/Variáveis** do app, cadastre todas as variáveis que estão em `.env.example` (mesmos nomes, com valores reais de produção — senha forte, `JWT_SECRET` longo e aleatório, etc.). O EasyPanel injeta essas variáveis no ambiente usado pelo `docker-compose.yml` no momento do build/deploy.

### d) Configurar domínio e porta exposta

- No EasyPanel, configure o **proxy/domínio** apontando para o serviço **frontend**, na porta **80** (porta interna do container nginx — não confundir com `FRONTEND_HOST_PORT`, que é usada apenas em execuções locais com `docker compose up` fora do EasyPanel).
- O EasyPanel geralmente detecta os serviços definidos no compose e permite escolher qual serviço/porta expor publicamente — escolha `frontend:80`.
- Não é necessário expor o serviço `backend` nem o `db` publicamente; o frontend já fala com o backend pela rede interna do compose (`http://backend:3333`).

### e) Primeiro deploy

Ao rodar o primeiro deploy, o EasyPanel vai:
1. Buildar as imagens de `backend` e `frontend` a partir dos Dockerfiles.
2. Subir o `db` (Postgres) e aguardar ele ficar saudável (healthcheck).
3. Subir o `backend`, cujo `docker-entrypoint.sh` aplica as migrations do Prisma (`prisma migrate deploy`) e roda o seed que cria o usuário `SUPER_ADMIN` automaticamente, usando `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
4. Subir o `frontend`, servindo o build estático via nginx e fazendo proxy de `/api/*` para o backend.

Depois disso, o painel já estará acessível no domínio configurado, e você pode logar com as credenciais do super admin definidas nas variáveis de ambiente.

### f) Como trocar a senha do super admin depois

O seed é **idempotente**: ele só cria o usuário se o e-mail ainda não existir, e nunca sobrescreve a senha de um usuário já existente. Para trocar a senha depois do primeiro deploy, use uma destas opções:

- Pelo próprio painel, se houver uma tela de "Alterar senha"/perfil do usuário logado (verifique em `src/pages` do frontend e na rota `/api/auth` do backend).
- Alterando `SEED_ADMIN_PASSWORD` no `.env` **não** tem efeito em um usuário já existente — é só usado na criação inicial.
- Se precisar resetar via banco diretamente, gere um novo hash bcrypt da senha desejada e atualize o campo `passwordHash` do usuário na tabela `User` via uma sessão de `psql` no container do `db`.

### g) SSL / HTTPS

O EasyPanel provisiona certificado SSL automaticamente (via Let's Encrypt) para o domínio configurado no proxy, desde que o DNS do domínio já esteja apontando para o servidor do EasyPanel antes de ativar o certificado. Não é necessária nenhuma configuração adicional de TLS nos containers — o nginx do frontend serve HTTP simples na porta 80, e o proxy do EasyPanel cuida do TLS termination.

## Como obter as credenciais da Meta (WABA ID, Phone Number ID e Access Token)

Essas credenciais são coladas na tela **"Credenciais Meta"** do painel (por tenant).

1. Acesse [Meta for Developers](https://developers.facebook.com/) e crie (ou acesse) um **App** do tipo "Business".
2. Adicione o produto **WhatsApp** ao App.
3. No painel do produto WhatsApp > **Introdução/Getting Started**, você verá:
   - **Phone Number ID** — ID do número de telefone de teste (ou do número de produção já verificado).
   - **WhatsApp Business Account ID (WABA ID)** — ID da conta business do WhatsApp associada ao App.
4. Gere um **Access Token**:
   - Para testes, é possível usar o token temporário gerado na própria tela "Getting Started" (expira em ~24h).
   - Para produção, gere um **token permanente**: crie um **System User** em [Business Settings > Usuários > Usuários do sistema](https://business.facebook.com/settings/system-users), atribua a ele o ativo do App do WhatsApp com permissão `whatsapp_business_messaging` e `whatsapp_business_management`, e gere um token sem expiração (ou de longa duração) para esse system user.
5. Cole os três valores (`wabaId`, `phoneNumberId`, `accessToken`) na tela "Credenciais Meta" do painel do tenant correspondente.

> Importante: para enviar mensagens de utilidade (ex: aviso de fatura) fora da janela de 24h de atendimento, os **templates de mensagem** usados precisam estar previamente criados e aprovados no Meta Business Manager, na categoria "Utilidade" (Utility).

## Formato do CSV de contatos

O upload de contatos (tela de Contatos do painel) espera um arquivo `.csv` com cabeçalho na primeira linha, contendo as colunas:

| Coluna | Obrigatória | Descrição |
|---|---|---|
| `nome` | Sim | Nome do contato |
| `whatsapp` | Sim | Número de WhatsApp (formato internacional, ex: `5511999999999`) |
| `valor_plano` | Não | Valor do plano/assinatura do contato (texto livre, ex: `R$ 49,90`) |
| `data_vencimento` | Não | Data de vencimento da fatura (texto livre, ex: `10/07/2026`) |
| `codigo_fatura` | Não | Código/identificador da fatura, usado em variáveis do template |

Linhas sem `nome` ou `whatsapp` são ignoradas. Colunas extras não reconhecidas são preservadas e ficam disponíveis como campos adicionais (armazenadas em `extraFieldsJson`), podendo ser usadas como variáveis extras no template de mensagem.

Exemplo de CSV válido:

```csv
nome,whatsapp,valor_plano,data_vencimento,codigo_fatura
João da Silva,5511999999999,R$ 49,90,10/07/2026,FAT-00123
Maria Souza,5521988888888,R$ 79,90,15/07/2026,FAT-00124
```
