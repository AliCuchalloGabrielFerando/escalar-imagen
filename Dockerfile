# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy .npmrc FIRST to allow build scripts for all subsequent pnpm commands
COPY .npmrc .npmrc

# Install node modules AND allow build scripts
# protobufjs@7.6.6 has build scripts that pnpm v12 blocks by default.
RUN pnpm install --frozen-lockfile --prod=false

# Force install exact Next.js 15.5.27 to prevent Turbopack 16.x
RUN pnpm add next@15.5.27

# Copy application code
COPY package.json pnpm-lock.yaml ./
COPY src ./src
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./

# Build application:
# - NODE_ENV=development coincide con el build local y evita el error de <Html> en prerender
# - SKIP_PREFLIGHT_CHECK evita el auto-pnpm add de TypeScript que falla con ERR_PNPM_IGNORED_BUILDS
ENV NODE_ENV=development
RUN SKIP_PREFLIGHT_CHECK=true npx next build

# Remove development dependencies
RUN pnpm prune --prod


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Entrypoint sets up the container.
ENTRYPOINT [ "/app/docker-entrypoint.js" ]

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "pnpm", "run", "start" ]