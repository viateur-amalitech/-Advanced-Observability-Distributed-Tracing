FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .
EXPOSE ${PORT}

CMD ["node", "index.js"]
