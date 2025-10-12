# Kafka Messaging & Event Streaming Guide

Complete guide to Kafka setup, configuration, and usage in the Liteyfy notification system.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Topics Configuration](#topics-configuration)
- [Setup & Installation](#setup--installation)
- [Producer Patterns](#producer-patterns)
- [Consumer Patterns](#consumer-patterns)
- [Event Filtering Logic](#event-filtering-logic)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Message Flow

```
External APIs
      ↓
Event Ingestion Service (Producer)
      ↓
Kafka Topics (train-events, weather-events, stib-events)
      ↓
Notification Delivery Service (Consumer)
      ↓
Event Filtering Service
      ↓
Push Notifications to Users
```

### Topics Structure

| Topic | Partitions | Retention | Purpose |
|-------|-----------|-----------|---------|
| `train-events` | 3 | 7 days | Train delays, cancellations, platform changes |
| `weather-events` | 2 | 7 days | Weather alerts and warnings |
| `stib-events` | 3 | 7 days | STIB/MIVB disruptions |
| `notification-dlq` | 1 | 30 days | Dead Letter Queue for failed notifications |
| `analytics-events` | 2 | 30 days | Analytics and metrics tracking |

---

## 🔧 Topics Configuration

### Topic Specifications

All topics are configured in `kafka-setup/topics.json`:

```json
{
  "name": "train-events",
  "partitions": 3,
  "replicationFactor": 1,
  "config": {
    "retention.ms": "604800000",
    "cleanup.policy": "delete",
    "compression.type": "snappy",
    "max.message.bytes": "1048576"
  }
}
```

### Configuration Explained

- **Partitions**: Number of parallel processing lanes
  - More partitions = higher throughput
  - `train-events` and `stib-events`: 3 partitions (higher volume)
  - `weather-events`: 2 partitions (moderate volume)

- **Retention**: How long messages are kept
  - Event topics: 7 days (`604800000` ms)
  - DLQ: 30 days (`2592000000` ms)

- **Compression**: `snappy` for fast compression/decompression

- **Replication Factor**: 1 for development, 3+ for production

### Setup Topics

```bash
cd backend/kafka-setup

# Install dependencies
npm install

# Setup all topics
npm run setup

# Verify topics
npm run verify
```

---

## 🚀 Setup & Installation

### 1. Start Kafka with Docker Compose

```bash
cd backend
docker-compose up -d zookeeper kafka
```

### 2. Verify Kafka is Running

```bash
# Check if Kafka is accessible
docker exec -it liteyfy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### 3. Create Topics

```bash
cd kafka-setup
npm run setup
```

### 4. Expected Output

```
[INFO] Connected to Kafka admin
[INFO] Existing topics:
[INFO] Created 5 topics: train-events, weather-events, stib-events, notification-dlq, analytics-events

📋 Topic Configuration Summary:

✅ train-events
   Description: Train delays, cancellations, and platform changes from iRail API
   Partitions: 3
   Retention: 7 days
   Compression: snappy

✅ weather-events
   Description: Weather alerts and warnings from KMI/IRM API
   Partitions: 2
   Retention: 7 days
   Compression: snappy

...
```

---

## 📤 Producer Patterns

### Basic Producer Usage

```javascript
import { KafkaConnection, KafkaProducerService } from '@liteyfy/shared';

// Initialize connection
const kafkaConnection = new KafkaConnection({ clientId: 'my-service' });
await kafkaConnection.createProducer();

// Initialize producer service
const producerService = new KafkaProducerService(kafkaConnection);
await producerService.initialize();

// Send single message
await producerService.sendMessage('train-events', {
  eventId: '123',
  type: 'TRAIN_DELAY',
  severity: 'HIGH',
  title: 'Train IC2534 delayed',
  affectedEntities: [{ type: 'TRAIN_LINE', id: 'IC-Brussels-Antwerp' }]
});

// Send batch
await producerService.sendBatch('train-events', [
  { /* event 1 */ },
  { /* event 2 */ },
  { /* event 3 */ }
]);
```

### Advanced Features

#### 1. Message Queuing with Auto-Batching

```javascript
// Queue messages - automatically batched every 5 seconds or 100 messages
producerService.queueMessage('train-events', eventData);
producerService.queueMessage('train-events', eventData2);
// ... batch will be sent automatically
```

#### 2. Retry Logic with Exponential Backoff

```javascript
// Automatic retries (3 attempts, exponential backoff)
await producerService.sendMessage('train-events', event, {
  retry: true,  // enabled by default
  maxRetries: 3
});
```

#### 3. Dead Letter Queue (DLQ)

```javascript
// Failed messages automatically sent to DLQ after max retries
// No manual configuration needed!
```

#### 4. Message Partitioning

```javascript
// Send to specific partition
await producerService.sendMessage('train-events', event, {
  partition: 0,  // Partition 0
  key: 'IC-Brussels-Antwerp'  // Or use key for consistent hashing
});
```

#### 5. Custom Headers

```javascript
await producerService.sendMessage('train-events', event, {
  headers: {
    'source': 'iRail-API',
    'priority': 'HIGH',
    'correlation-id': '12345'
  }
});
```

### Producer Metrics

```javascript
const metrics = producerService.getMetrics();
console.log(metrics);
// {
//   sent: 1500,
//   failed: 10,
//   retried: 8,
//   queueSize: 5,
//   successRate: 99.34
// }
```

---

## 📥 Consumer Patterns

### Basic Consumer Usage

```javascript
import { KafkaConnection } from '@liteyfy/shared';

const kafkaConnection = new KafkaConnection({ clientId: 'notification-service' });

// Create and subscribe consumer
await kafkaConnection.createConsumer('notification-delivery-group', [
  'train-events',
  'weather-events',
  'stib-events'
]);

const consumer = kafkaConnection.getConsumer();

// Start consuming
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    console.log('Received event:', event);

    // Process event
    await processEvent(event);
  }
});
```

### Consumer Groups

Consumer groups enable horizontal scaling:

```javascript
// Multiple instances with same group ID = load balancing
const consumer1 = await kafkaConnection.createConsumer('my-group', ['train-events']);
const consumer2 = await kafkaConnection.createConsumer('my-group', ['train-events']);
// consumer1 gets partitions [0, 1]
// consumer2 gets partition [2]
```

### Error Handling in Consumers

```javascript
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const event = JSON.parse(message.value.toString());
      await processEvent(event);
    } catch (error) {
      logger.error('Failed to process message:', error);

      // Send to DLQ
      await producerService.sendToDLQ(topic, event, error);

      // Don't throw - acknowledges message and moves on
    }
  }
});
```

### Consumer Offset Management

```javascript
// Auto-commit (default)
await kafkaConnection.createConsumer('my-group', topics, {
  autoCommit: true,
  autoCommitInterval: 5000  // Commit every 5 seconds
});

// Manual commit
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    await processEvent(JSON.parse(message.value.toString()));

    // Commit after successful processing
    await consumer.commitOffsets([{
      topic,
      partition,
      offset: (parseInt(message.offset) + 1).toString()
    }]);
  }
});
```

---

## 🎯 Event Filtering Logic

### Sophisticated Subscription Matching

The `EventFilteringService` intelligently matches events to user subscriptions based on multiple criteria:

#### 1. Train Event Filtering

```javascript
import { EventFilteringService } from '@liteyfy/shared';

const filteringService = new EventFilteringService();

// Find all users subscribed to a train delay event
const event = {
  type: 'TRAIN_DELAY',
  severity: 'HIGH',
  affectedEntities: [{
    type: 'TRAIN_LINE',
    id: 'IC-Brussels-Antwerp'
  }],
  metadata: {
    departure: { delay: 900 }  // 15 minutes delay
  }
};

const subscriptions = await filteringService.findAffectedSubscriptions(event);
// Returns only users who:
// - Are subscribed to 'IC-Brussels-Antwerp'
// - Have 'notifyDelays' enabled
// - Have minDelayMinutes <= 15
// - Are not in quiet hours (or event is CRITICAL)
```

#### 2. Delay Threshold Filtering

Users can set minimum delay thresholds:

| User Setting | Delay | Notification? |
|--------------|-------|---------------|
| minDelayMinutes: 5 | 15 min | ✅ Yes |
| minDelayMinutes: 10 | 15 min | ✅ Yes |
| minDelayMinutes: 20 | 15 min | ❌ No |

```javascript
// Automatic filtering based on user preferences
const trainSub = {
  lineId: 'IC-Brussels-Antwerp',
  enabled: true,
  notifyDelays: true,
  minDelayMinutes: 10  // Only notify if delay >= 10 minutes
};
```

#### 3. Weather Alert Type Filtering

```javascript
const event = {
  type: 'WEATHER_ALERT',
  title: 'Thunderstorm warning',
  affectedEntities: [{
    type: 'REGION',
    id: 'brussels'
  }]
};

// Only users who:
// - Are subscribed to 'brussels' region
// - Have 'THUNDERSTORM' in their alertTypes array
const subscriptions = await filteringService.findAffectedSubscriptions(event);
```

#### 4. Quiet Hours Filtering

```javascript
const subscription = {
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '07:00',
    allowCritical: true
  }
};

// At 23:00 (11 PM):
// - LOW, MEDIUM, HIGH events: ❌ Blocked
// - CRITICAL events: ✅ Allowed (because allowCritical: true)

subscription.isNotificationAllowed('MEDIUM');  // false at 23:00
subscription.isNotificationAllowed('CRITICAL');  // true at 23:00
```

#### 5. Multi-Entity Matching

Events can affect multiple entities:

```javascript
const event = {
  affectedEntities: [
    { type: 'TRAIN_LINE', id: 'IC-Brussels-Antwerp' },
    { type: 'TRAIN_LINE', id: 'IC-Brussels-Ghent' },
    { type: 'STATION', id: 'Brussels-Central' }
  ]
};

// Finds users subscribed to ANY of these entities
const subscriptions = await filteringService.findAffectedSubscriptions(event);
```

### Filtering Performance

```javascript
// Get matching statistics
const stats = await filteringService.getMatchingStats(event);
// {
//   totalActive: 10000,
//   matched: 350,
//   matchRate: '3.50%',
//   byLanguage: { en: 200, fr: 100, nl: 50 }
// }
```

### Custom Filters

Extend the filtering service:

```javascript
class CustomEventFilteringService extends EventFilteringService {
  async applyFilters(subscriptions, event) {
    let filtered = await super.applyFilters(subscriptions, event);

    // Add custom filter: only premium users for CRITICAL events
    if (event.severity === 'CRITICAL') {
      filtered = filtered.filter(sub => sub.isPremium);
    }

    return filtered;
  }
}
```

---

## 📊 Monitoring & Health Checks

### Kafka Monitoring Service

```javascript
import { KafkaConnection, KafkaMonitoringService } from '@liteyfy/shared';

const kafkaConnection = new KafkaConnection({ clientId: 'monitor' });
const monitoringService = new KafkaMonitoringService(kafkaConnection);
await monitoringService.initialize();

// Get complete health status
const health = await monitoringService.getHealthStatus();
console.log(health);
// {
//   status: 'HEALTHY',
//   timestamp: '2025-10-11T23:00:00.000Z',
//   cluster: {
//     brokers: 3,
//     brokersDetails: [...]
//   },
//   topics: {
//     'train-events': { partitions: 3, hasError: false, ... },
//     'weather-events': { partitions: 2, hasError: false, ... }
//   },
//   consumerLags: {...}
// }
```

### Consumer Lag Monitoring

```javascript
// Monitor consumer lag
const lag = await monitoringService.getConsumerLag('notification-delivery-group');
console.log(lag);
// {
//   'train-events': {
//     partitions: [
//       { partition: 0, offset: '1500', lag: 10 },
//       { partition: 1, offset: '1450', lag: 5 },
//       { partition: 2, offset: '1480', lag: 8 }
//     ],
//     totalLag: 23
//   }
// }

// Alert if lag exceeds threshold
await monitoringService.monitorConsumerLag('notification-delivery-group', 1000);
// [WARN] High consumer lag detected: train-events lag=1200
```

### Health Check Endpoint

Add to your service:

```javascript
app.get('/kafka/health', async (req, res) => {
  const health = await monitoringService.getHealthStatus();
  res.status(health.status === 'HEALTHY' ? 200 : 503).json(health);
});
```

---

## ⚡ Performance Tuning

### Producer Optimization

```javascript
// 1. Increase batch size
producerService.batchSize = 500;  // default: 100
producerService.batchTimeout = 10000;  // default: 5000ms

// 2. Use compression
await producerService.sendMessage('train-events', event, {
  compression: 'snappy'  // or 'gzip', 'lz4'
});

// 3. Async fire-and-forget (no waiting)
producerService.queueMessage('analytics-events', event);
```

### Consumer Optimization

```javascript
// 1. Increase fetch size
await kafkaConnection.createConsumer('my-group', topics, {
  maxBytes: 10485760,  // 10MB per fetch
  maxWaitTimeInMs: 500
});

// 2. Parallel processing
await consumer.run({
  eachBatchAutoResolve: true,
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    const promises = batch.messages.map(async (message) => {
      await processMessage(message);
      resolveOffset(message.offset);
    });

    await Promise.all(promises);
    await heartbeat();
  }
});
```

### Partitioning Strategy

```javascript
// Use consistent hashing for related events
const lineId = 'IC-Brussels-Antwerp';
await producerService.sendMessage('train-events', event, {
  key: lineId  // All events for this line go to same partition
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Consumer Not Receiving Messages

```bash
# Check if consumer is part of group
docker exec -it liteyfy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group notification-delivery-group

# Reset offset to beginning (development only!)
docker exec -it liteyfy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-delivery-group \
  --reset-offsets --to-earliest --topic train-events --execute
```

#### Issue 2: High Consumer Lag

**Causes:**
- Consumer processing too slow
- Not enough consumer instances
- Network issues

**Solutions:**
```javascript
// 1. Add more consumer instances (same group ID)
// 2. Increase parallelism
// 3. Optimize processing logic
// 4. Increase partition count (requires recreation)

await admin.createPartitions({
  topicPartitions: [
    { topic: 'train-events', count: 5 }  // increase from 3 to 5
  ]
});
```

#### Issue 3: Messages Stuck in DLQ

```bash
# View DLQ messages
docker exec -it liteyfy-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic notification-dlq \
  --from-beginning

# Process DLQ messages
node scripts/process-dlq.js
```

#### Issue 4: Connection Timeout

```javascript
// Increase timeout and retries
const kafkaConnection = new KafkaConnection({
  clientId: 'my-service',
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});
```

### Debugging Commands

```bash
# List all topics
docker exec -it liteyfy-kafka kafka-topics \
  --bootstrap-server localhost:9092 --list

# Describe topic
docker exec -it liteyfy-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe --topic train-events

# List consumer groups
docker exec -it liteyfy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 --list

# View messages
docker exec -it liteyfy-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic train-events \
  --from-beginning --max-messages 10
```

---

## 🎯 Best Practices

### 1. Topic Design

- ✅ **DO**: Use separate topics for different event types
- ✅ **DO**: Plan partition count based on expected throughput
- ❌ **DON'T**: Create too many topics (management overhead)
- ❌ **DON'T**: Use single partition for high-volume topics

### 2. Message Design

- ✅ **DO**: Keep messages small (<1MB)
- ✅ **DO**: Include timestamp and correlation IDs
- ✅ **DO**: Use schema versioning
- ❌ **DON'T**: Include large binary data
- ❌ **DON'T**: Send sensitive data without encryption

### 3. Producer Patterns

- ✅ **DO**: Use batching for high throughput
- ✅ **DO**: Implement retries with exponential backoff
- ✅ **DO**: Use DLQ for failed messages
- ❌ **DON'T**: Send synchronously in request path

### 4. Consumer Patterns

- ✅ **DO**: Use idempotent processing
- ✅ **DO**: Commit offsets after successful processing
- ✅ **DO**: Scale consumers horizontally with same group ID
- ❌ **DON'T**: Process messages synchronously without parallelization
- ❌ **DON'T**: Ignore consumer lag

### 5. Monitoring

- ✅ **DO**: Monitor consumer lag continuously
- ✅ **DO**: Set up alerts for topic health issues
- ✅ **DO**: Track producer/consumer metrics
- ❌ **DON'T**: Ignore warning signs (lag, errors)

---

## 📚 Additional Resources

- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **KafkaJS Documentation**: https://kafka.js.org/
- **Liteyfy Backend README**: [backend/README.md](README.md)

---

## 🆘 Support

For issues or questions:
- Open a GitHub issue
- Contact: admin@liteyfy.be
- Check logs: `docker-compose logs -f kafka`

