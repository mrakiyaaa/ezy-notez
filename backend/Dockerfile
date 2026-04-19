# ─────────────────────────────────────────────
# Stage: base — shared foundation
# ─────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─────────────────────────────────────────────
# Stage: dev — hot-reload development server
# Uses ts-node-dev (TypeScript-aware nodemon equivalent)
# ─────────────────────────────────────────────
FROM base AS dev
# Install all dependencies including devDependencies (ts-node-dev, typescript)
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund

# Copy source so the image works standalone;
# in compose the host bind-mount will shadow this.
COPY . .

EXPOSE 3001
ENV NODE_ENV=development

# npm run dev → ts-node-dev --respawn --transpile-only src/index.ts
CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────────
# Stage: builder — compile TypeScript
# ─────────────────────────────────────────────
FROM base AS builder
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund
COPY . .
RUN npm run build

# ─────────────────────────────────────────────
# Stage: prod — minimal production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled JS, runtime node_modules, and package manifest
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3001

# npm start → node dist/index.js
CMD ["npm", "start"]
