# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install pnpm
RUN npm install -g pnpm@latest


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules AND allow build scripts
# protobufjs@7.6.6 has build scripts that pnpm v12 blocks by default.
RUN echo "ignore-scripts = false" > .npmrc && \
    pnpm install --frozen-lockfile --prod=false

# Force install Next.js 15.5.27 (exact version from package.json)
# This overrides any newer version that might be resolved by default
RUN pnpm add next@15.5.27

# Copy application code
COPY . .

# Build application using classic compiler (not Turbopack)
# NEXT_BUILD_MODE=classic ensures we use the traditional Babel/Webpack compiler
ENV NEXT_BUILD_MODE=classic
RUN npx next build

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