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

# node:20-slim не содержит wget/curl — используем встроенный fetch Node 20.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
