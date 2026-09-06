# Publicar o FRONT do painel na Render (Static Site)

Preparado, **NÃO publicado**. Publicar é o último passo, quando o Chris liberar.

## Contexto
- Front (client React/Vite) hoje: **Vercel** (`painel-administrativo-smoky.vercel.app` / `painel-administrativo.vercel.app`) — conta de terceiro, travada por 2FA.
- Backend (Express): **Render** `painel-administrativo-rh15.onrender.com` — conta do Chris (feminnita@gmail.com). **Não mexer.**
- Meta: mover o front pra Render (conta do Chris), painel inteiro numa conta controlada.

## Passo a passo (quando for publicar)

### 1. Criar o Static Site na Render
Opção A (Blueprint, mais fácil): Dashboard → **New → Blueprint** → conecta o repo `feminnita/painel-administrativo` → ele lê o `render.yaml` da raiz e cria o serviço `painel-administrativo-client`.
Opção B (manual): New → **Static Site** → repo `feminnita/painel-administrativo`, com:
- **Branch:** `develop`
- **Root Directory:** `client`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment Variable:** `VITE_API_URL = https://painel-administrativo-rh15.onrender.com`
- **Redirect/Rewrite (SPA):** `/*` → `/index.html` (Rewrite)

Domínio resultante: `https://painel-administrativo-client.onrender.com` (ou o nome que escolher).

### 2. Ajustar o CORS do backend (SEM mexer no código — é por env)
No serviço **backend** `painel-administrativo-rh15` na Render → **Environment** → variável **`CORS_ORIGINS`**:
- Adicionar o domínio novo do front, separado por vírgula. Ex.:
  `https://painel-administrativo-client.onrender.com,http://localhost:3001`
- Manter `http://localhost:3001` (dev). Pode manter o domínio Vercel enquanto migra, ou remover depois.
- Salvar → o backend reinicia sozinho e passa a aceitar o front novo.

### 3. Conferir
- Abrir o domínio novo do front → login → produtos carregam (prova que o CORS + VITE_API_URL estão certos).
- Quando estável, apontar o domínio custom (se houver) e desativar o deploy da Vercel.

## Notas
- O `render.yaml` na raiz já traz tudo do item 1 (Blueprint).
- `VITE_API_URL` é injetado em **build time** (Vite) — se trocar a URL do backend, rebuildar o front.
- A loja (site-feminnita) fica na Vercel por enquanto (decisão do Chris).
