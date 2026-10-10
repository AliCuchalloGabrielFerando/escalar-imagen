# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app

# Mantener una versión reproducible de pnpm
RUN npm install -g pnpm@12.10.1

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copiar primero los archivos de dependencias
COPY package.json pnpm-lock.yaml .npmrc ./

# Instalar dependencias de producción y desarrollo
RUN pnpm install --frozen-lockfile --prod=false

# Copiar el resto del proyecto
COPY . .

# Build de producción
ENV NODE_ENV=production
RUN pnpm exec next build

# Quitar dependencias de desarrollo después de compilar
RUN pnpm prune --prod

FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

ENTRYPOINT [ "/app/docker-entrypoint.js" ]

EXPOSE 3000
CMD ["pnpm", "run", "start"]