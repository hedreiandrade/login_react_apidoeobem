# Usa a imagem oficial do Node 14.17.5
FROM node:14.17.5-alpine

# Define o diretório de trabalho no container
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (cache mais eficiente)
COPY package.json package-lock.json* ./

# Instala as dependências do projeto
RUN npm ci --silent

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que a aplicação vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação em modo desenvolvimento
CMD ["npm", "start"]