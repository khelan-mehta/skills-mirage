# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Accept build-time API URL (baked into the static bundle by Vite)
ARG VITE_API_URL=http://localhost:3700/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Expose raw server IP for constructing other backend URLs (e.g. OAuth)
ARG VITE_SERVER_IP=localhost
ENV VITE_SERVER_IP=$VITE_SERVER_IP

RUN npm run build


# ── Production image — serve via node ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
