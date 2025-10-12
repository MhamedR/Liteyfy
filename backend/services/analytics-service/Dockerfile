FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY ./shared/package.json ./shared/
WORKDIR /app/shared
RUN npm install --production

# Copy service package and install its dependencies
WORKDIR /app/service
COPY ./services/analytics-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy shared code
WORKDIR /app
COPY ./shared ./shared

# Copy service code
COPY ./services/analytics-service/src ./service/src

WORKDIR /app/service

EXPOSE 3004

CMD ["npm", "start"]

