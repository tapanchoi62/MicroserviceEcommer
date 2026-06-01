FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target es2020 --esModuleInterop --skipLibCheck --strict false

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
COPY entrypoint.sh ./
RUN npm ci --only=production && chmod +x entrypoint.sh
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3002
CMD ["./entrypoint.sh"]
