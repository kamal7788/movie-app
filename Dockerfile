FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY public/ ./public/

EXPOSE 6969

CMD ["node", "server/index.js"]
