FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY ./shared/package.json ./shared/
WORKDIR /app/shared
RUN npm install --production

# Copy service package and install its dependencies
WORKDIR /app/service
COPY ./services/user-subscription-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy service code
WORKDIR /app/service
COPY ./services/user-subscription-service/src ./src

# Copy shared code into the service for proper imports
COPY ./shared ../shared

EXPOSE 3001

CMD ["npm", "start"]

