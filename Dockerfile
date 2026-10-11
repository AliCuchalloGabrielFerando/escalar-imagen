# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@12.10.1

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copiar primero: .npmrc (para allow-build scripts) y package-lock
COPY .npmrc .npmrc
COPY package.json pnpm-lock.yaml ./

# Copiar configuración de pnpm para autorizar scripts de protobufjs
COPY pnpm-workspace.yaml ./

# Instalar dependencias (frozen lockfile)
# Con pnpm-workspace.yaml configurado, protobufjs ya está autorizado
RUN pnpm install --frozen-lockfile --prod=false

# Copiar resto del proyecto
COPY . .

# Build de Next.js
ENV NODE_ENV=production
RUN pnpm exec next build

# Quitar dependencias de desarrollo
RUN pnpm prune --prod


FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

ENTRYPOINT [ "/app/docker-entrypoint.js" ]

EXPOSE 3000
CMD ["pnpm", "run", "start"]