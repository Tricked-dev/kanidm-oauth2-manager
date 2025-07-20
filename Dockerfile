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

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
RUN ulimit -c unlimited
CMD ["bun", "run", "./build/index.js"]