FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (including devDeps for build)
COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci
RUN cd client && npm ci

# Copy source
COPY server/ ./server/
COPY client/ ./client/
COPY public/ ./public/

# Build frontend into server/public
RUN cd client && npx vite build --outDir ../server/public

# Production stage
FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/server/ ./server/
COPY --from=builder /app/public/ ./public/

RUN mkdir -p /data/uploads

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

EXPOSE 8080

CMD ["node", "server/index.js"]
