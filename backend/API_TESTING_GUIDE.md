# Liteyfy Backend API Testing Guide

This guide provides comprehensive documentation for testing all backend API endpoints using Postman or any HTTP client.

## Service Overview

The Liteyfy backend consists of 4 microservices:

| Service | Port | Description |
|---------|------|-------------|
| User Subscription Service | 3001 | Manages push notification subscriptions and GDPR compliance |
| Event Ingestion Service | 3002 | Ingests data from external APIs (trains, weather, STIB) |
| Notification Delivery Service | 3003 | Processes and delivers push notifications |
| Analytics Service | 3004 | Provides analytics and metrics |

## 1. Health Check Endpoints

All services provide health check endpoints to verify they're running properly.

### User Subscription Service
```http
GET http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "user-subscription-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### Event Ingestion Service
```http
GET http://localhost:3002/health
```

### Notification Delivery Service
```http
GET http://localhost:3003/health
```

### Analytics Service
```http
GET http://localhost:3004/health
```

## 2. User Subscription Service (Port 3001)

### REST API Endpoints

#### Create/Update Subscription
```http
POST http://localhost:3001/api/subscriptions
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
  "keys": {
    "p256dh": "example-p256dh-key",
    "auth": "example-auth-key"
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "language": "en"
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
  "language": "en",
  "active": true,
  "isNew": true,
  "trainLines": [],
  "weatherRegions": [],
  "stibLines": [],
  "quietHours": {
    "enabled": false,
    "startTime": "22:00",
    "endTime": "07:00",
    "allowCritical": true
  }
}
```

#### Get Subscription
```http
GET http://localhost:3001/api/subscriptions/{endpoint}
```

**Example:**
```http
GET http://localhost:3001/api/subscriptions/https%3A%2F%2Ffcm.googleapis.com%2Ffcm%2Fsend%2Fexample-endpoint
```

#### Update Train Lines
```http
PATCH http://localhost:3001/api/subscriptions/{endpoint}/train-lines
Content-Type: application/json

{
  "trainLines": [
    {
      "lineId": "IC-01",
      "lineName": "Brussels-Antwerp",
      "enabled": true,
      "notifyDelays": true,
      "notifyCancellations": true,
      "minDelayMinutes": 5
    },
    {
      "lineId": "IC-02",
      "lineName": "Brussels-Ghent",
      "enabled": true,
      "notifyDelays": true,
      "notifyCancellations": false,
      "minDelayMinutes": 10
    }
  ]
}
```

#### Remove Train Line
```http
DELETE http://localhost:3001/api/subscriptions/{endpoint}/train-lines/{lineId}
```

**Example:**
```http
DELETE http://localhost:3001/api/subscriptions/https%3A%2F%2Ffcm.googleapis.com%2Ffcm%2Fsend%2Fexample-endpoint/train-lines/IC-01
```

#### Update Weather Regions
```http
PATCH http://localhost:3001/api/subscriptions/{endpoint}/weather-regions
Content-Type: application/json

{
  "weatherRegions": [
    {
      "regionId": "brussels",
      "regionName": "Brussels",
      "enabled": true,
      "alertTypes": ["severe_weather", "flood_warning", "storm_alert"]
    },
    {
      "regionId": "antwerp",
      "regionName": "Antwerp",
      "enabled": true,
      "alertTypes": ["severe_weather"]
    }
  ]
}
```

#### Remove Weather Region
```http
DELETE http://localhost:3001/api/subscriptions/{endpoint}/weather-regions/{regionId}
```

#### Update STIB Lines
```http
PATCH http://localhost:3001/api/subscriptions/{endpoint}/stib-lines
Content-Type: application/json

{
  "stibLines": [
    {
      "lineId": "1",
      "lineName": "Metro Line 1",
      "lineType": "metro",
      "enabled": true,
      "notifyDisruptions": true
    },
    {
      "lineId": "3",
      "lineName": "Tram Line 3",
      "lineType": "tram",
      "enabled": true,
      "notifyDisruptions": true
    }
  ]
}
```

#### Remove STIB Line
```http
DELETE http://localhost:3001/api/subscriptions/{endpoint}/stib-lines/{lineId}
```

#### Update Quiet Hours
```http
PATCH http://localhost:3001/api/subscriptions/{endpoint}/quiet-hours
Content-Type: application/json

{
  "enabled": true,
  "startTime": "22:00",
  "endTime": "07:00",
  "allowCritical": true
}
```

#### Delete Subscription
```http
DELETE http://localhost:3001/api/subscriptions/{endpoint}
```

**Response:** 204 No Content

### GraphQL API

The service also provides a GraphQL endpoint at `http://localhost:3001/graphql` with GraphiQL playground available in non-production environments.

#### Create Subscription (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation CreateSubscription($input: SubscriptionInput!) { createSubscription(input: $input) { _id endpoint language active trainLines { lineId lineName enabled } weatherRegions { regionId regionName enabled } stibLines { lineId lineName enabled } quietHours { enabled startTime endTime allowCritical } } }",
  "variables": {
    "input": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/example",
      "keys": {
        "p256dh": "example-p256dh-key",
        "auth": "example-auth-key"
      },
      "language": "en"
    }
  }
}
```

#### Get Subscription (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "query GetSubscription($endpoint: String!) { subscription(endpoint: $endpoint) { _id endpoint trainLines { lineId lineName enabled notifyDelays notifyCancellations minDelayMinutes } weatherRegions { regionId regionName enabled alertTypes } stibLines { lineId lineName lineType enabled notifyDisruptions } quietHours { enabled startTime endTime allowCritical } language active } }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example"
  }
}
```

#### Update Train Lines (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation UpdateTrainLines($endpoint: String!, $trainLines: [TrainLineInput!]!) { updateTrainLines(endpoint: $endpoint, trainLines: $trainLines) { _id trainLines { lineId lineName enabled notifyDelays notifyCancellations minDelayMinutes } } }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example",
    "trainLines": [
      {
        "lineId": "IC-01",
        "lineName": "Brussels-Antwerp",
        "enabled": true,
        "notifyDelays": true,
        "notifyCancellations": true,
        "minDelayMinutes": 5
      }
    ]
  }
}
```

#### Update Weather Regions (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation UpdateWeatherRegions($endpoint: String!, $weatherRegions: [WeatherRegionInput!]!) { updateWeatherRegions(endpoint: $endpoint, weatherRegions: $weatherRegions) { _id weatherRegions { regionId regionName enabled alertTypes } } }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example",
    "weatherRegions": [
      {
        "regionId": "brussels",
        "regionName": "Brussels",
        "enabled": true,
        "alertTypes": ["severe_weather", "flood_warning"]
      }
    ]
  }
}
```

#### Update STIB Lines (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation UpdateStibLines($endpoint: String!, $stibLines: [StibLineInput!]!) { updateStibLines(endpoint: $endpoint, stibLines: $stibLines) { _id stibLines { lineId lineName lineType enabled notifyDisruptions } } }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example",
    "stibLines": [
      {
        "lineId": "1",
        "lineName": "Metro Line 1",
        "lineType": "metro",
        "enabled": true,
        "notifyDisruptions": true
      }
    ]
  }
}
```

#### Update Quiet Hours (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation UpdateQuietHours($endpoint: String!, $quietHours: QuietHoursInput!) { updateQuietHours(endpoint: $endpoint, quietHours: $quietHours) { _id quietHours { enabled startTime endTime allowCritical } } }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example",
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "07:00",
      "allowCritical": true
    }
  }
}
```

#### Delete Subscription (GraphQL)
```http
POST http://localhost:3001/graphql
Content-Type: application/json

{
  "query": "mutation DeleteSubscription($endpoint: String!) { deleteSubscription(endpoint: $endpoint) }",
  "variables": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example"
  }
}
```

## 3. GDPR Service (Port 3001)

### Grant Consent
```http
POST http://localhost:3001/api/gdpr/consent/grant
Content-Type: application/json

{
  "userId": "user123",
  "consentType": "PUSH_NOTIFICATIONS",
  "privacyPolicyVersion": "1.0"
}
```

**Available consent types:**
- `PUSH_NOTIFICATIONS`
- `DATA_PROCESSING`
- `ANALYTICS`

**Response:**
```json
{
  "message": "Consent granted successfully",
  "consent": {
    "userId": "user123",
    "pushNotifications": true,
    "dataProcessing": false,
    "analytics": false
  }
}
```

### Revoke Consent
```http
POST http://localhost:3001/api/gdpr/consent/revoke
Content-Type: application/json

{
  "userId": "user123",
  "consentType": "PUSH_NOTIFICATIONS"
}
```

### Get Consent Status
```http
GET http://localhost:3001/api/gdpr/consent/status/{userId}
```

**Example:**
```http
GET http://localhost:3001/api/gdpr/consent/status/user123
```

**Response:**
```json
{
  "userId": "user123",
  "pushNotificationsConsent": {
    "granted": true,
    "grantedAt": "2024-01-15T10:30:00.000Z",
    "privacyPolicyVersion": "1.0"
  },
  "dataProcessingConsent": {
    "granted": false,
    "grantedAt": null,
    "privacyPolicyVersion": null
  },
  "analyticsConsent": {
    "granted": false,
    "grantedAt": null,
    "privacyPolicyVersion": null
  }
}
```

### Request Data Deletion
```http
POST http://localhost:3001/api/gdpr/delete
Content-Type: application/json

{
  "userId": "user123"
}
```

**Response:**
```json
{
  "message": "Data deletion request submitted",
  "deletionId": "del_507f1f77bcf86cd799439011",
  "scheduledFor": "2024-01-22T10:30:00.000Z",
  "status": "pending"
}
```

### Cancel Data Deletion
```http
POST http://localhost:3001/api/gdpr/delete/cancel
Content-Type: application/json

{
  "userId": "user123"
}
```

### Export User Data
```http
GET http://localhost:3001/api/gdpr/export/{userId}
```

**Example:**
```http
GET http://localhost:3001/api/gdpr/export/user123
```

**Response:**
```json
{
  "message": "Data export completed",
  "data": {
    "userId": "user123",
    "subscriptions": [
      {
        "endpoint": "https://fcm.googleapis.com/fcm/send/example",
        "language": "en",
        "active": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "consentHistory": [
      {
        "action": "GRANT_CONSENT",
        "consentType": "PUSH_NOTIFICATIONS",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Get Consent Audit Trail
```http
GET http://localhost:3001/api/gdpr/audit/{userId}
```

**Example:**
```http
GET http://localhost:3001/api/gdpr/audit/user123
```

## 4. Analytics Service (Port 3004)

### Get Notification Metrics
```http
GET http://localhost:3004/api/analytics/notifications/metrics?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
```

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `groupBy`: Grouping period (`day`, `week`, `month`)

**Response:**
```json
{
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "groupBy": "day"
  },
  "metrics": [
    {
      "date": "2024-01-01",
      "sent": 150,
      "delivered": 145,
      "failed": 5,
      "deliveryRate": 96.67
    }
  ],
  "totals": {
    "sent": 4650,
    "delivered": 4500,
    "failed": 150,
    "deliveryRate": 96.77
  }
}
```

### Get Subscription Stats
```http
GET http://localhost:3004/api/analytics/subscriptions/stats
```

**Response:**
```json
{
  "totalSubscriptions": 1250,
  "activeSubscriptions": 1200,
  "inactiveSubscriptions": 50,
  "subscriptionsByLanguage": {
    "en": 800,
    "fr": 300,
    "nl": 150
  },
  "subscriptionsByType": {
    "train": 600,
    "weather": 400,
    "stib": 200
  }
}
```

### Get Event Stats
```http
GET http://localhost:3004/api/analytics/events/stats?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "eventTypes": {
    "train": {
      "total": 1500,
      "delays": 800,
      "cancellations": 200,
      "onTime": 500
    },
    "weather": {
      "total": 300,
      "alerts": 50,
      "warnings": 100,
      "normal": 150
    },
    "stib": {
      "total": 200,
      "disruptions": 50,
      "normal": 150
    }
  }
}
```

### Get Performance Metrics
```http
GET http://localhost:3004/api/analytics/performance
```

**Response:**
```json
{
  "responseTimes": {
    "average": 150,
    "p95": 300,
    "p99": 500
  },
  "throughput": {
    "requestsPerSecond": 50,
    "eventsProcessedPerMinute": 100
  },
  "errorRates": {
    "total": 0.5,
    "byService": {
      "user-subscription-service": 0.2,
      "analytics-service": 0.1,
      "notification-delivery-service": 0.2
    }
  }
}
```

## 5. Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:3001` | User subscription service base URL |
| `analytics_url` | `http://localhost:3004` | Analytics service base URL |
| `endpoint` | `https://fcm.googleapis.com/fcm/send/example-endpoint` | Test push notification endpoint |
| `userId` | `user123` | Test user ID |
| `lineId` | `IC-01` | Test train line ID |
| `regionId` | `brussels` | Test weather region ID |

### Collection Structure
Organize your Postman collection with these folders:

1. **Health Checks**
   - All service health endpoints

2. **User Subscription Service (REST)**
   - Create/Update subscription
   - Get subscription
   - Update train lines
   - Remove train line
   - Update weather regions
   - Remove weather region
   - Update STIB lines
   - Remove STIB line
   - Update quiet hours
   - Delete subscription

3. **User Subscription Service (GraphQL)**
   - All GraphQL mutations and queries

4. **GDPR Service**
   - Grant consent
   - Revoke consent
   - Get consent status
   - Request data deletion
   - Cancel data deletion
   - Export user data
   - Get audit trail

5. **Analytics Service**
   - Notification metrics
   - Subscription stats
   - Event stats
   - Performance metrics

### Pre-request Scripts
Add this script to automatically set common headers:

```javascript
pm.request.headers.add({
  key: 'Content-Type',
  value: 'application/json'
});
```

### Test Scripts
Add these tests to validate responses:

```javascript
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    // Add specific field validations based on endpoint
});
```

## 6. Testing Workflow

### 1. Health Check
Start by testing all health endpoints to ensure services are running.

### 2. Subscription Management
1. Create a new subscription
2. Update train lines, weather regions, and STIB lines
3. Test quiet hours configuration
4. Retrieve subscription data
5. Delete subscription

### 3. GDPR Compliance
1. Grant various types of consent
2. Check consent status
3. Request data export
4. Request data deletion
5. Cancel data deletion
6. Review audit trail

### 4. Analytics
1. Check notification metrics
2. Review subscription statistics
3. Analyze event statistics
4. Monitor performance metrics

### 5. GraphQL Testing
1. Use the GraphQL playground at `http://localhost:3001/graphql`
2. Test all mutations and queries
3. Validate response schemas

## 7. Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": {
    "message": "Endpoint and keys are required"
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "message": "Subscription not found"
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": {
    "message": "Internal server error"
  }
}
```

### GraphQL Errors
GraphQL errors follow this format:
```json
{
  "errors": [
    {
      "message": "Validation error",
      "locations": [{"line": 2, "column": 3}],
      "path": ["createSubscription"]
    }
  ],
  "data": null
}
```

## 8. Rate Limiting and Best Practices

- **Rate Limiting**: No explicit rate limiting is implemented, but consider adding it for production
- **Authentication**: Currently no authentication is required, but this should be added for production
- **CORS**: All services have CORS enabled for cross-origin requests
- **Validation**: All endpoints include input validation using Joi schemas
- **Logging**: All services include comprehensive logging

## 9. Monitoring and Debugging

### Logs
Check service logs for debugging:
```bash
# View logs for specific service
docker logs liteyfy-user-subscription-service
docker logs liteyfy-analytics-service
```

### Metrics
Use the analytics endpoints to monitor:
- Response times
- Error rates
- Throughput
- Delivery rates

### Health Monitoring
Regularly check health endpoints to ensure all services are operational.

---

This guide provides comprehensive testing coverage for all Liteyfy backend APIs. Use it to validate functionality, test edge cases, and ensure proper integration between services.
