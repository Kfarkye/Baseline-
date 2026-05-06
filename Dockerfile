FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app

# Copy package files and install ALL deps (tsx is in devDependencies)
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy server source + config
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "tsx", "server.ts"]
