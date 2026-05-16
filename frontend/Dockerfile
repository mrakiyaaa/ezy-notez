# ─────────────────────────────────────────────
# Stage: base — shared foundation
# ─────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─────────────────────────────────────────────
# Stage: dev — hot-reload development server
# ─────────────────────────────────────────────
FROM base AS dev
# Install all dependencies (including devDependencies)
RUN npm install --legacy-peer-deps

# Copy source so the image works standalone;
# in compose the host bind-mount will shadow this.
COPY . .

EXPOSE 3000
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────────
# Stage: builder — compile for production
# ─────────────────────────────────────────────
FROM base AS builder
RUN npm install --legacy-peer-deps
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time by Next.js.
# They must be passed as build args here — runtime env vars arrive too late.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────────
# Stage: prod — minimal production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# next.config.ts has output:"standalone" — copy its artefacts
COPY --from=builder /app/public                              ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
