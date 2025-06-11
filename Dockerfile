FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
COPY .env ./
RUN npm install

COPY . .

FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY .env ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]