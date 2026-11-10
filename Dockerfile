FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
VOLUME /app/data
CMD ["sh", "-c", "npm run setup && npm start"]
