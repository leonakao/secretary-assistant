FROM node:22.11-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.17

WORKDIR /usr/src/app

FROM base AS deps

COPY pnpm-lock.yaml ./

RUN pnpm fetch --frozen-lockfile

FROM deps AS deps-prod

COPY package.json ./

RUN pnpm install --frozen-lockfile --offline --prod

FROM deps AS build

COPY . .

RUN pnpm install --frozen-lockfile --offline

RUN pnpm build

FROM node:22.11-alpine AS production

WORKDIR /usr/src/app

RUN mkdir -p .adminjs && chown -R node:node .adminjs

COPY --from=deps-prod --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/package.json .
COPY --from=build --chown=node:node /usr/src/app/pnpm-lock.yaml .
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
COPY --from=build --chown=node:node /usr/src/app/public ./public

USER node

EXPOSE 3000

CMD [ "node", "dist/main.js" ]
