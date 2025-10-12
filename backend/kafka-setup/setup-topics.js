import 'dotenv/config';
import { readFileSync } from 'fs';
import { Kafka } from 'kafkajs';

const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || '')
};

async function setupKafkaTopics() {
  try {
    // Load topics configuration
    const topicsConfig = JSON.parse(readFileSync('./topics.json', 'utf-8'));

    // Initialize Kafka admin client
    const kafka = new Kafka({
      clientId: 'kafka-setup',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });

    const admin = kafka.admin();
    await admin.connect();
    logger.info('Connected to Kafka admin');

    // Get existing topics
    const existingTopics = await admin.listTopics();
    logger.info(`Existing topics: ${existingTopics.join(', ')}`);

    // Create topics
    const topicsToCreate = [];

    for (const topic of topicsConfig.topics) {
      if (existingTopics.includes(topic.name)) {
        logger.warn(`Topic ${topic.name} already exists, skipping...`);
        continue;
      }

      topicsToCreate.push({
        topic: topic.name,
        numPartitions: topic.partitions,
        replicationFactor: topic.replicationFactor,
        configEntries: Object.entries(topic.config).map(([key, value]) => ({
          name: key,
          value: String(value)
        }))
      });
    }

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true,
        timeout: 30000
      });
      logger.info(`Created ${topicsToCreate.length} topics:`, topicsToCreate.map(t => t.topic));
    } else {
      logger.info('No new topics to create');
    }

    // Verify topics and print configuration
    logger.info('\n📋 Topic Configuration Summary:\n');
    for (const topic of topicsConfig.topics) {
      const metadata = await admin.fetchTopicMetadata({ topics: [topic.name] });
      const topicMeta = metadata.topics[0];

      if (topicMeta && !topicMeta.error) {
        logger.info(`✅ ${topic.name}`);
        logger.info(`   Description: ${topic.description}`);
        logger.info(`   Partitions: ${topicMeta.partitions.length}`);
        logger.info(`   Retention: ${parseInt(topic.config['retention.ms']) / 86400000} days`);
        logger.info(`   Compression: ${topic.config['compression.type']}`);
        logger.info('');
      }
    }

    await admin.disconnect();
    logger.info('✅ Kafka topics setup completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to setup Kafka topics:', error);
    process.exit(1);
  }
}

setupKafkaTopics();

