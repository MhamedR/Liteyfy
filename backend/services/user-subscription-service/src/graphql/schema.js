import { buildSchema } from 'graphql';
import { SubscriptionService } from '../services/subscriptionService.js';

const subscriptionService = new SubscriptionService();

export const schema = buildSchema(`
  type Query {
    subscription(endpoint: String!): Subscription
  }

  type Mutation {
    createSubscription(input: SubscriptionInput!): Subscription
    updateTrainLines(endpoint: String!, trainLines: [TrainLineInput!]!): Subscription
    updateWeatherRegions(endpoint: String!, weatherRegions: [WeatherRegionInput!]!): Subscription
    updateStibLines(endpoint: String!, stibLines: [StibLineInput!]!): Subscription
    updateQuietHours(endpoint: String!, quietHours: QuietHoursInput!): Subscription
    deleteSubscription(endpoint: String!): Boolean
  }

  type Subscription {
    _id: ID!
    endpoint: String!
    trainLines: [TrainLine!]!
    weatherRegions: [WeatherRegion!]!
    stibLines: [StibLine!]!
    quietHours: QuietHours!
    language: String!
    active: Boolean!
  }

  input SubscriptionInput {
    endpoint: String!
    keys: KeysInput!
    language: String
  }

  input KeysInput {
    p256dh: String!
    auth: String!
  }

  type TrainLine {
    lineId: String!
    lineName: String!
    enabled: Boolean!
    notifyDelays: Boolean!
    notifyCancellations: Boolean!
    minDelayMinutes: Int!
  }

  input TrainLineInput {
    lineId: String!
    lineName: String!
    enabled: Boolean
    notifyDelays: Boolean
    notifyCancellations: Boolean
    minDelayMinutes: Int
  }

  type WeatherRegion {
    regionId: String!
    regionName: String!
    enabled: Boolean!
    alertTypes: [String!]!
  }

  input WeatherRegionInput {
    regionId: String!
    regionName: String!
    enabled: Boolean
    alertTypes: [String!]
  }

  type StibLine {
    lineId: String!
    lineName: String!
    lineType: String!
    enabled: Boolean!
    notifyDisruptions: Boolean!
  }

  input StibLineInput {
    lineId: String!
    lineName: String!
    lineType: String!
    enabled: Boolean
    notifyDisruptions: Boolean
  }

  type QuietHours {
    enabled: Boolean!
    startTime: String!
    endTime: String!
    allowCritical: Boolean!
  }

  input QuietHoursInput {
    enabled: Boolean
    startTime: String
    endTime: String
    allowCritical: Boolean
  }
`);

export const root = {
  subscription: async ({ endpoint }) => {
    return subscriptionService.getByEndpoint(endpoint);
  },
  createSubscription: async ({ input }) => {
    return subscriptionService.createOrUpdate(input);
  },
  updateTrainLines: async ({ endpoint, trainLines }) => {
    return subscriptionService.updateTrainLines(endpoint, trainLines);
  },
  updateWeatherRegions: async ({ endpoint, weatherRegions }) => {
    return subscriptionService.updateWeatherRegions(endpoint, weatherRegions);
  },
  updateStibLines: async ({ endpoint, stibLines }) => {
    return subscriptionService.updateStibLines(endpoint, stibLines);
  },
  updateQuietHours: async ({ endpoint, quietHours }) => {
    return subscriptionService.updateQuietHours(endpoint, quietHours);
  },
  deleteSubscription: async ({ endpoint }) => {
    return subscriptionService.delete(endpoint);
  }
};

