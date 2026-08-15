FROM oven/bun:1-alpine AS base

WORKDIR /app

# Instala apenas as dependências
FROM base AS dependencies

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# Build
FROM base AS build

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Caso futuramente exista uma etapa de build:
# RUN bun run build

# Produção
FROM base AS production

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
