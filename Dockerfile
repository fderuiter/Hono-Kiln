# use the official Bun image
FROM oven/bun:1-alpine AS base
WORKDIR /app

# install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/api/package.json /temp/dev/packages/api/
COPY packages/shared/package.json /temp/dev/packages/shared/
COPY packages/sdk/package.json /temp/dev/packages/sdk/
# testing package might be needed by workspace during install if lockfile expects it
COPY packages/testing/package.json /temp/dev/packages/testing/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY packages/api/package.json /temp/prod/packages/api/
COPY packages/shared/package.json /temp/prod/packages/shared/
COPY packages/sdk/package.json /temp/prod/packages/sdk/
COPY packages/testing/package.json /temp/prod/packages/testing/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=install /temp/prod/node_modules node_modules

# Copy application code
COPY package.json ./
COPY packages/api/ ./packages/api/
COPY packages/shared/ ./packages/shared/

# Set the port
ENV PORT=3000
EXPOSE 3000/tcp

# Run as non-root user
USER bun

# Execute the application
ENTRYPOINT [ "bun", "run", "packages/api/index.ts" ]
