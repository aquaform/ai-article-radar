FROM node:20-slim

WORKDIR /app

# Сначала зависимости (кэш слоёв).
COPY package*.json ./
RUN npm ci

# Исходники и сборка TypeScript.
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
