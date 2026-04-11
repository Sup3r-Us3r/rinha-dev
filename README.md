# Rinha Arena 1v1 (Realtime Multiplayer)

Jogo de luta **1v1 online** com servidor autoritativo.

- **Frontend**: Vite + TypeScript + TailwindCSS + Three.js
- **Backend**: Node.js + TypeScript + Socket.io
- **Comunicação**: WebSocket em tempo real (60 FPS)

## Estrutura

```text
/client   # aplicação web (Vite + Three.js)
/server   # servidor Socket.io autoritativo
/shared   # tipos TypeScript compartilhados entre client/server
```

## Requisitos

- Node.js 20+
- npm 10+

## Como rodar localmente

Abra **dois terminais** na raiz do projeto.

### 1) Servidor

```bash
cd server
npm install
npm run dev
```

Servidor sobe por padrão em `http://localhost:3001`.
Health check: `GET /health`.

### 2) Cliente

```bash
cd client
npm install
npm run dev
```

Cliente sobe por padrão em `http://localhost:5173`.

## Variáveis de ambiente

No cliente, você pode configurar a URL do servidor remoto usando:

- `VITE_SERVER_URL`

Exemplo (`client/.env`):

```env
VITE_SERVER_URL=https://seu-servidor-exemplo.com
```

Sem essa variável, o cliente usa `http://localhost:3001`.

## Scripts

### Client (`/client`)

- `npm run dev` – ambiente de desenvolvimento
- `npm run build` – build de produção (TypeScript + Vite)
- `npm run lint` – lint do frontend
- `npm run preview` – preview do build

### Server (`/server`)

- `npm run dev` – servidor em modo watch (`tsx`)
- `npm run build` – compila TypeScript para `dist`
- `npm run start` – executa build compilado

## Fluxo do jogo

1. Jogador A clica em **Criar Sala**
2. O sistema gera um código de sala com 4 dígitos
3. Jogador B entra com esse código
4. Ao ter 2 jogadores, a luta começa automaticamente
5. O servidor valida inputs, movimentação, hit e cooldown
6. Quando o HP de alguém chega a 0, o servidor emite `game-over`

## Deploy (guia rápido)

### Backend

Você pode publicar em qualquer host Node.js (Railway, Render, Fly.io, VPS, etc):

1. Subir projeto `server`
2. Configurar `PORT` (se o provedor exigir)
3. Rodar:
   - build: `npm run build`
   - start: `npm run start`

### Frontend

Pode publicar em Vercel, Netlify, Cloudflare Pages, etc:

1. Build command: `npm run build`
2. Output dir: `dist`
3. Definir variável:
   - `VITE_SERVER_URL=https://URL_DO_BACKEND`

## Notas técnicas

- Estado do jogo fica em memória no servidor (sem banco)
- Jogadores são anônimos (sem autenticação)
- Interpolação e predição local simples no cliente para suavizar movimento
- Eventos Socket.io e estado centralizados em `shared/types.ts`
