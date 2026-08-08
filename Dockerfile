FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=80
ENV DB_PATH=/app/data/pelitrack.db
EXPOSE 80
VOLUME ["/app/data"]
CMD ["npm", "start"]
