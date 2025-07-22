FROM docker.io/oven/bun:latest as build

WORKDIR /app

COPY src ./src
COPY bun.lock ./bun.lock
COPY *.json ./
COPY *.ts ./
COPY *.js ./

RUN bun install
RUN bun run build

FROM docker.io/oven/bun:latest AS run


ARG BUILD_VERSION
ARG BUILD_DATE
ARG BUILD_COMMIT_SHA

LABEL org.opencontainers.image.title="Kanidm OAuth2 Manager" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_COMMIT_SHA}" \
      org.opencontainers.image.description="A web-based management interface for Kanidm OAuth2 applications." \
      org.opencontainers.image.documentation="https://github.com/Tricked-dev/kanidm-oauth2-manager" \
      org.opencontainers.image.vendor.name="Tricked-dev" \
      org.opencontainers.image.licenses="MPL-2.0" \
      org.opencontainers.image.source="https://github.com/Tricked-dev/kanidm-oauth2-manager"

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
RUN ulimit -c unlimited

CMD ["bun", "--smol", "run", "./build/index.js"] 