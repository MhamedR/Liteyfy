FROM node:20-alpine

# Set up the directory structure to match local development
WORKDIR /app/backend

# Copy and install shared dependencies
COPY ./shared/package.json ./shared/
WORKDIR /app/backend/shared
RUN npm install --production

# Copy shared source code
WORKDIR /app/backend
COPY ./shared ./shared

# Copy and install service dependencies
WORKDIR /app/backend/services/user-subscription-service
COPY ./services/user-subscription-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy service source code
COPY ./services/user-subscription-service/src ./src

EXPOSE 3001

CMD ["npm", "start"]

