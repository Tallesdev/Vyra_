FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache de layers)
COPY package.json package-lock.json* ./
RUN npm install

# O restante do código vem via volume no dev
# mas copiamos aqui para que o build de produção funcione
COPY . .

# Gera o Prisma Client
RUN npx prisma generate

EXPOSE 3000

# Hot-reload com node --watch (nativo, sem nodemon)
CMD ["node", "--watch", "src/server.js"]
