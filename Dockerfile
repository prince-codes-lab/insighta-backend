FROM node:20-alpine

WORKDIR /app

# Install production dependencies only (no devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
