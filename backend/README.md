# Liteyfy Backend - Microservices Architecture

Real-time notification system backend built with Node.js microservices, Kafka, MongoDB, and Redis.

## 🏗️ Architecture Overview

The backend consists of 4 independent microservices that communicate via Kafka event streaming:

```
┌─────────────────────────────────────────────────────────────────┐
│                     External APIs                               │
│  (iRail API, STIB OpenData, KMI/IRM Weather API)              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│        Event Ingestion Service (Port 3002)                     │
│  • Fetches data from external APIs (cron jobs)                │
│  • Normalizes and validates events                             │
│  • Publishes to Kafka topics                                   │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼  (Kafka Topics: train-events, weather-events, stib-events)
┌────────────────────────────────────────────────────────────────┐
│     Notification Delivery Service (Port 3003)                  │
│  • Consumes events from Kafka                                  │
│  • Matches events with user subscriptions                      │
│  • Sends Web Push notifications                                │
│  • Handles retries and dead-letter queue                       │
└────────────────────────────────────────────────────────────────┘
             │
             ▼  (Updates notification status)
┌────────────────────────────────────────────────────────────────┐
│         User Subscription Service (Port 3001)                  │
│  • REST API + GraphQL for managing subscriptions               │
│  • CRUD operations for user preferences                        │
│  • Stores push notification endpoints                          │
└────────────────────────────────────────────────────────────────┘
             │
             │  (Shared MongoDB Database)
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│            Analytics Service (Port 3004)                       │
│  • Aggregates metrics and stats                                │
│  • Redis caching for performance                               │
│  • REST API for analytics data                                 │
└────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
backend/
├── shared/                          # Shared libraries and models
│   ├── config/
│   │   ├── database.js              # MongoDB connection helper
│   │   ├── redis.js                 # Redis connection helper
│   │   └── kafka.js                 # Kafka connection helper
│   ├── models/
│   │   ├── Subscription.js          # User subscription schema
│   │   ├── Notification.js          # Notification tracking schema
│   │   └── Event.js                 # Event schema
│   ├── utils/
│   │   ├── logger.js                # Winston logger
│   │   └── validation.js            # Joi validation schemas
│   ├── package.json
│   └── index.js                     # Exports
│
├── services/
│   ├── user-subscription-service/   # Port 3001
│   │   ├── src/
│   │   │   ├── controllers/         # Request handlers
│   │   │   ├── services/            # Business logic
│   │   │   ├── routes/              # REST routes
│   │   │   ├── graphql/             # GraphQL schema
│   │   │   └── server.js            # Entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── event-ingestion-service/     # Port 3002
│   │   ├── src/
│   │   │   ├── adapters/            # API integrations
│   │   │   ├── jobs/                # Cron jobs & processors
│   │   │   └── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-delivery-service/ # Port 3003
│   │   ├── src/
│   │   │   ├── services/            # Push notification logic
│   │   │   ├── consumers/           # Kafka consumers
│   │   │   └── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── analytics-service/           # Port 3004
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── server.js
│       ├── Dockerfile
│       └── package.json
│
└── docker-compose.yml               # Full stack orchestration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ LTS
- **Docker** & **Docker Compose**
- **Git**

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/MhamedR/Liteyfy.git
cd Liteyfy/backend

# Generate VAPID keys for Web Push
npx web-push generate-vapid-keys
```

### 2. Environment Variables

Create a `.env` file in the backend root:

```env
# VAPID Keys (from step 1)
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@liteyfy.be
```

### 3. Start Infrastructure + Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
curl http://localhost:3001/health  # User Subscription Service
curl http://localhost:3002/health  # Event Ingestion Service
curl http://localhost:3003/health  # Notification Delivery Service
curl http://localhost:3004/health  # Analytics Service
```

### 4. Development Mode (Local)

```bash
# Install dependencies for all services
cd shared && npm install
cd ../services/user-subscription-service && npm install
cd ../event-ingestion-service && npm install
cd ../notification-delivery-service && npm install
cd ../analytics-service && npm install

# Start MongoDB, Redis, Kafka with Docker
docker-compose up -d mongodb redis zookeeper kafka

# Run services locally (in separate terminals)
cd services/user-subscription-service && npm run dev
cd services/event-ingestion-service && npm run dev
cd services/notification-delivery-service && npm run dev
cd services/analytics-service && npm run dev
```

## 📡 API Documentation

### User Subscription Service (Port 3001)

#### REST API

**Create/Update Subscription**
```http
POST /api/subscriptions
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "language": "en",
  "trainLines": [],
  "weatherRegions": [],
  "stibLines": []
}
```

**Get Subscription**
```http
GET /api/subscriptions/:endpoint
```

**Update Train Lines**
```http
PATCH /api/subscriptions/:endpoint/train-lines
Content-Type: application/json

{
  "trainLines": [
    {
      "lineId": "IC-Brussels-Antwerp",
      "lineName": "IC Brussels - Antwerp",
      "enabled": true,
      "notifyDelays": true,
      "notifyCancellations": true,
      "minDelayMinutes": 5
    }
  ]
}
```

**Update Quiet Hours**
```http
PATCH /api/subscriptions/:endpoint/quiet-hours
Content-Type: application/json

{
  "enabled": true,
  "startTime": "22:00",
  "endTime": "07:00",
  "allowCritical": true
}
```

**Delete Subscription**
```http
DELETE /api/subscriptions/:endpoint
```

#### GraphQL API

Access GraphQL Playground at `http://localhost:3001/graphql`

**Example Queries**

```graphql
# Get subscription
query {
  subscription(endpoint: "https://fcm.googleapis.com/...") {
    _id
    trainLines {
      lineId
      lineName
      enabled
    }
    weatherRegions {
      regionId
      regionName
      alertTypes
    }
    quietHours {
      enabled
      startTime
      endTime
    }
  }
}

# Update subscription
mutation {
  updateTrainLines(
    endpoint: "https://fcm.googleapis.com/..."
    trainLines: [{
      lineId: "IC-Brussels-Antwerp"
      lineName: "IC Brussels - Antwerp"
      enabled: true
      notifyDelays: true
    }]
  ) {
    _id
    trainLines {
      lineId
      enabled
    }
  }
}
```

### Analytics Service (Port 3004)

**Get Notification Metrics**
```http
GET /api/analytics/notifications/metrics?startDate=2025-01-01&endDate=2025-01-31&groupBy=day
```

Response:
```json
{
  "total": 15000,
  "byStatus": [
    { "_id": "SENT", "count": 14500 },
    { "_id": "FAILED", "count": 500 }
  ],
  "byType": [
    { "_id": "TRAIN_DELAY", "count": 8000, "avgRetries": 0.2 },
    { "_id": "WEATHER_ALERT", "count": 5000, "avgRetries": 0.1 }
  ],
  "successRate": "96.67"
}
```

**Get Subscription Stats**
```http
GET /api/analytics/subscriptions/stats
```

**Get Event Stats**
```http
GET /api/analytics/events/stats?startDate=2025-01-01&endDate=2025-01-31
```

**Get Performance Metrics**
```http
GET /api/analytics/performance
```

## 🔧 Configuration

### Environment Variables

Each service supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | Service-specific |
| `NODE_ENV` | Environment | `development` |
| `SERVICE_NAME` | Service identifier | Service name |
| `LOG_LEVEL` | Logging level | `info` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/liteyfy` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KAFKA_BROKERS` | Kafka brokers (comma-separated) | `localhost:9092` |

### Kafka Topics

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `train-events` | Event Ingestion | Notification Delivery | Train delays and cancellations |
| `weather-events` | Event Ingestion | Notification Delivery | Weather alerts |
| `stib-events` | Event Ingestion | Notification Delivery | STIB disruptions |

### MongoDB Collections

- **subscriptions**: User preferences and push endpoints
- **notifications**: Sent notifications with delivery status
- **events**: Ingested events from external APIs

## 🧪 Testing

```bash
# Run unit tests for a service
cd services/user-subscription-service
npm test

# Test API endpoints
curl -X POST http://localhost:3001/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "test", "keys": {"p256dh": "test", "auth": "test"}}'
```

## 📊 Monitoring & Logging

All services use structured logging with Winston:

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f user-subscription-service

# Follow Kafka consumer activity
docker-compose logs -f notification-delivery-service | grep "Received event"
```

## 🔒 Security Considerations

- **Authentication**: Add JWT/OAuth2 authentication for production
- **Rate Limiting**: Implemented in User Subscription Service
- **Input Validation**: Joi schemas validate all incoming data
- **CORS**: Configure allowed origins in production
- **Secrets**: Use environment variables or secret managers
- **MongoDB**: Enable authentication in production

## 📈 Performance

- **Redis Caching**: Analytics Service caches metrics (5-10 min TTL)
- **MongoDB Indexes**: Optimized queries on subscriptions and events
- **Kafka Partitioning**: Distribute load across consumers
- **Connection Pooling**: MongoDB connection pool (max 10)

## 🚀 Deployment

### Production Checklist

1. ✅ Set `NODE_ENV=production`
2. ✅ Configure MongoDB authentication
3. ✅ Enable Redis persistence
4. ✅ Set up Kafka cluster (3+ brokers)
5. ✅ Configure monitoring (Prometheus/Grafana)
6. ✅ Set up log aggregation (ELK Stack)
7. ✅ Enable HTTPS/TLS
8. ✅ Configure backup strategy

### Docker Production Build

```bash
# Build and push images
docker-compose build
docker tag liteyfy-user-subscription-service:latest your-registry/liteyfy-user-subscription-service:latest
docker push your-registry/liteyfy-user-subscription-service:latest

# Deploy with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## 🔗 External API Integrations

### iRail API (Belgian Railways)

- **Base URL**: `https://api.irail.be`
- **Endpoints**:
  - `/liveboard/` - Real-time departures
  - `/connections/` - Journey planning
- **Rate Limit**: No official limit, use responsibly
- **Documentation**: https://docs.irail.be

### STIB-MIVB Open Data (Brussels Public Transport)

- **Base URL**: `https://data.stib-mivb.brussels/api/explore/v2.1/catalog/datasets`
- **Endpoints**:
  - `/waitingtime-rt-production/records` - Real-time waiting times
  - `/gtfs-stops-production` - Stop information
- **Documentation**: https://opendata.stib-mivb.be

### KMI/IRM Weather API (Belgian Met Office)

- **Base URL**: `https://opendata.meteo.be`
- **Endpoints**:
  - `/service/warning/bel` - Weather warnings for Belgium
- **Documentation**: https://opendata.meteo.be

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👥 Authors

- Liteyfy Team

## 📧 Support

For questions or issues, please open a GitHub issue or contact admin@liteyfy.be

