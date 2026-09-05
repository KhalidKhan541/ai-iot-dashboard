// =============================================================================
// STREAMING SERVICE - Real-Time WebSocket, MQTT & Data Push
// =============================================================================
// Manages real-time data streaming with WebSocket push, MQTT integration,
// subscription management, data buffering, and backpressure handling.
// =============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export enum StreamProtocol {
  WEBSOCKET = 'websocket',
  MQTT = 'mqtt',
  SSE = 'sse',
  GRPC_STREAM = 'grpc_stream',
}

export enum SubscriptionType {
  DEVICE_DATA = 'device_data',
  DEVICE_STATUS = 'device_status',
  ALERTS = 'alerts',
  AGGREGATED = 'aggregated',
  CUSTOM = 'custom',
}

export interface StreamMessage {
  id: string;
  type: string;
  deviceId?: string;
  capabilityId?: string;
  data: unknown;
  timestamp: Date;
  sequence: number;
  metadata: Record<string, unknown>;
}

export interface StreamSubscription {
  id: string;
  clientId: string;
  type: SubscriptionType;
  filters: SubscriptionFilter;
  protocol: StreamProtocol;
  status: 'active' | 'paused' | 'closed';
  createdAt: Date;
  lastActiveAt: Date;
  messagesSent: number;
  messagesFailed: number;
  backpressureDrops: number;
  metadata: Record<string, unknown>;
}

export interface SubscriptionFilter {
  deviceIds?: string[];
  capabilityIds?: string[];
  tags?: string[];
  dataTypes?: string[];
  qualityThreshold?: number;
  minInterval?: number; // ms between sends
  maxRate?: number; // max messages per second
}

export interface StreamClient {
  id: string;
  protocol: StreamProtocol;
  status: 'connected' | 'disconnected' | 'reconnecting';
  connectedAt: Date;
  lastActivityAt: Date;
  subscriptions: string[];
  buffer: StreamMessage[];
  bufferUsage: number;
  maxBufferSize: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
  send: (message: StreamMessage) => Promise<boolean>;
  close: (reason?: string) => void;
}

export interface MqttBrokerConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  keepAlive: number;
  cleanSession: boolean;
  reconnectPeriod: number;
  connectTimeout: number;
  will?: {
    topic: string;
    payload: string;
    qos: 0 | 1 | 2;
    retain: boolean;
  };
  tls?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface BackpressureConfig {
  enabled: boolean;
  maxBufferSize: number;
  highWaterMark: number;
  lowWaterMark: number;
  dropStrategy: 'drop_oldest' | 'drop_newest' | 'drop_all' | 'block';
  maxDroppedMessages: number;
  alertThreshold: number;
  cooldownPeriod: number;
}

export interface DataBufferConfig {
  enabled: boolean;
  maxSize: number;
  flushInterval: number; // ms
  batchSize: number;
  compress: boolean;
  deduplicate: boolean;
  deduplicateWindow: number; // ms
  priority: 'fifo' | 'lifo' | 'priority';
}

export interface StreamingConfig {
  maxClients: number;
  maxSubscriptionsPerClient: number;
  maxSubscriptionsTotal: number;
  messageTimeout: number; // ms
  heartbeatInterval: number; // ms
  reconnectEnabled: boolean;
  reconnectMaxAttempts: number;
  reconnectBackoffMs: number;
  enableMetrics: boolean;
  metricsInterval: number; // ms
  backpressure: BackpressureConfig;
  buffer: DataBufferConfig;
  mqtt?: MqttBrokerConfig;
}

const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  maxClients: 10000,
  maxSubscriptionsPerClient: 100,
  maxSubscriptionsTotal: 100000,
  messageTimeout: 5000,
  heartbeatInterval: 30000,
  reconnectEnabled: true,
  reconnectMaxAttempts: 10,
  reconnectBackoffMs: 1000,
  enableMetrics: true,
  metricsInterval: 10000,
  backpressure: {
    enabled: true,
    maxBufferSize: 10000,
    highWaterMark: 8000,
    lowWaterMark: 2000,
    dropStrategy: 'drop_oldest',
    maxDroppedMessages: 1000,
    alertThreshold: 500,
    cooldownPeriod: 30000,
  },
  buffer: {
    enabled: true,
    maxSize: 50000,
    flushInterval: 1000,
    batchSize: 100,
    compress: false,
    deduplicate: true,
    deduplicateWindow: 5000,
    priority: 'fifo',
  },
};

// -----------------------------------------------------------------------------
// Streaming Metrics
// -----------------------------------------------------------------------------

export interface StreamingMetrics {
  totalClients: number;
  activeClients: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalMessagesPublished: number;
  totalMessagesDelivered: number;
  totalMessagesDropped: number;
  totalBytesTransferred: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  publishRate: number; // messages per second
  deliveryRate: number;
  dropRate: number;
  bufferUtilization: number;
  byProtocol: Record<StreamProtocol, {
    clients: number;
    subscriptions: number;
    messages: number;
    bytes: number;
  }>;
  bySubscriptionType: Record<SubscriptionType, {
    subscriptions: number;
    messages: number;
  }>;
}

// -----------------------------------------------------------------------------
// Streaming Service
// -----------------------------------------------------------------------------

export class StreamingService extends EventEmitter {
  private clients: Map<string, StreamClient> = new Map();
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private clientSubscriptions: Map<string, Set<string>> = new Map(); // clientId -> subscriptionIds
  private subscriptionClients: Map<string, Set<string>> = new Map(); // subscriptionId -> clientIds

  private publishBuffer: StreamMessage[] = [];
  private publishTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private metrics: StreamingMetrics;

  private config: StreamingConfig;
  private sequenceNumber = 0;
  private messageHashes: Map<string, number> = new Map();

  // MQTT simulation
  private mqttConnected = false;
  private mqttSubscriptions: Map<string, (message: StreamMessage) => void> = new Map();

  constructor(config: Partial<StreamingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startTimers();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this.publishTimer) clearInterval(this.publishTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Close all clients
    for (const client of this.clients.values()) {
      client.close('service_destroyed');
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.clientSubscriptions.clear();
    this.subscriptionClients.clear();
  }

  private initializeMetrics(): StreamingMetrics {
    return {
      totalClients: 0,
      activeClients: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalMessagesPublished: 0,
      totalMessagesDelivered: 0,
      totalMessagesDropped: 0,
      totalBytesTransferred: 0,
      averageLatencyMs: 0,
      maxLatencyMs: 0,
      publishRate: 0,
      deliveryRate: 0,
      dropRate: 0,
      bufferUtilization: 0,
      byProtocol: {
        [StreamProtocol.WEBSOCKET]: { clients: 0, subscriptions: 0, messages: 0, bytes: 0 },
        [StreamProtocol.MQTT]: { clients: 0, subscriptions: 0, messages: 0, bytes: 0 },
        [StreamProtocol.SSE]: { clients: 0, subscriptions: 0, messages: 0, bytes: 0 },
        [StreamProtocol.GRPC_STREAM]: { clients: 0, subscriptions: 0, messages: 0, bytes: 0 },
      },
      bySubscriptionType: {
        [SubscriptionType.DEVICE_DATA]: { subscriptions: 0, messages: 0 },
        [SubscriptionType.DEVICE_STATUS]: { subscriptions: 0, messages: 0 },
        [SubscriptionType.ALERTS]: { subscriptions: 0, messages: 0 },
        [SubscriptionType.AGGREGATED]: { subscriptions: 0, messages: 0 },
        [SubscriptionType.CUSTOM]: { subscriptions: 0, messages: 0 },
      },
    };
  }

  private startTimers(): void {
    this.publishTimer = setInterval(() => {
      this.flushPublishBuffer();
    }, this.config.buffer.flushInterval);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats();
    }, this.config.heartbeatInterval);

    if (this.config.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.updateMetrics();
      }, this.config.metricsInterval);
    }
  }

  // -------------------------------------------------------------------------
  // Client Management
  // -------------------------------------------------------------------------

  registerClient(
    protocol: StreamProtocol,
    metadata: Record<string, unknown> = {},
    sendCallback?: (message: StreamMessage) => Promise<boolean>,
    closeCallback?: (reason?: string) => void
  ): StreamClient {
    if (this.clients.size >= this.config.maxClients) {
      throw new Error('Maximum client limit reached');
    }

    const clientId = uuidv4();
    const now = new Date();

    const client: StreamClient = {
      id: clientId,
      protocol,
      status: 'connected',
      connectedAt: now,
      lastActivityAt: now,
      subscriptions: [],
      buffer: [],
      bufferUsage: 0,
      maxBufferSize: this.config.backpressure.maxBufferSize,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      latencyMs: 0,
      metadata,
      send: sendCallback || this.createDefaultSendCallback(clientId),
      close: closeCallback || this.createDefaultCloseCallback(clientId),
    };

    this.clients.set(clientId, client);
    this.clientSubscriptions.set(clientId, new Set());

    this.metrics.totalClients++;
    this.metrics.activeClients++;
    this.metrics.byProtocol[protocol].clients++;

    this.emit('client:connected', { clientId, protocol });

    return client;
  }

  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove all subscriptions
    const subs = this.clientSubscriptions.get(clientId);
    if (subs) {
      for (const subId of subs) {
        this.unsubscribe(subId);
      }
    }

    client.status = 'disconnected';
    this.clients.delete(clientId);
    this.clientSubscriptions.delete(clientId);

    this.metrics.activeClients--;
    this.metrics.byProtocol[client.protocol].clients--;

    this.emit('client:disconnected', { clientId });
  }

  private createDefaultSendCallback(clientId: string): (message: StreamMessage) => Promise<boolean> {
    return async (message: StreamMessage) => {
      const client = this.clients.get(clientId);
      if (!client || client.status !== 'connected') return false;
      if (client.bufferUsage >= client.maxBufferSize) return false;

      client.buffer.push(message);
      client.bufferUsage++;
      client.messagesSent++;
      client.lastActivityAt = new Date();

      return true;
    };
  }

  private createDefaultCloseCallback(clientId: string): (reason?: string) => void {
    return (reason?: string) => {
      this.unregisterClient(clientId);
      this.emit('client:closed', { clientId, reason });
    };
  }

  getClient(clientId: string): StreamClient | undefined {
    return this.clients.get(clientId);
  }

  getActiveClients(): StreamClient[] {
    return Array.from(this.clients.values()).filter(c => c.status === 'connected');
  }

  // -------------------------------------------------------------------------
  // Subscription Management
  // -------------------------------------------------------------------------

  subscribe(
    clientId: string,
    type: SubscriptionType,
    filters: SubscriptionFilter = {},
    protocol: StreamProtocol = StreamProtocol.WEBSOCKET
  ): StreamSubscription {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`Client not found: ${clientId}`);

    if (client.subscriptions.length >= this.config.maxSubscriptionsPerClient) {
      throw new Error(`Client ${clientId} has reached maximum subscription limit`);
    }

    if (this.subscriptions.size >= this.config.maxSubscriptionsTotal) {
      throw new Error('Maximum subscription limit reached');
    }

    const subscription: StreamSubscription = {
      id: uuidv4(),
      clientId,
      type,
      filters,
      protocol,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      messagesSent: 0,
      messagesFailed: 0,
      backpressureDrops: 0,
      metadata: {},
    };

    this.subscriptions.set(subscription.id, subscription);
    client.subscriptions.push(subscription.id);

    const clientSubs = this.clientSubscriptions.get(clientId) || new Set();
    clientSubs.add(subscription.id);
    this.clientSubscriptions.set(clientId, clientSubs);

    const subClients = this.subscriptionClients.get(subscription.id) || new Set();
    subClients.add(clientId);
    this.subscriptionClients.set(subscription.id, subClients);

    this.metrics.totalSubscriptions++;
    this.metrics.activeSubscriptions++;
    this.metrics.byProtocol[protocol].subscriptions++;
    this.metrics.bySubscriptionType[type].subscriptions++;

    this.emit('subscription:created', { subscriptionId: subscription.id, clientId, type });

    return subscription;
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    const client = this.clients.get(subscription.clientId);
    if (client) {
      client.subscriptions = client.subscriptions.filter(s => s !== subscriptionId);
    }

    const clientSubs = this.clientSubscriptions.get(subscription.clientId);
    if (clientSubs) {
      clientSubs.delete(subscriptionId);
    }

    this.subscriptionClients.delete(subscriptionId);
    this.subscriptions.delete(subscriptionId);

    this.metrics.activeSubscriptions--;
    this.metrics.byProtocol[subscription.protocol].subscriptions--;
    this.metrics.bySubscriptionType[subscription.type].subscriptions--;

    this.emit('subscription:deleted', { subscriptionId });

    return true;
  }

  pauseSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.status !== 'active') return false;

    subscription.status = 'paused';
    this.emit('subscription:paused', { subscriptionId });
    return true;
  }

  resumeSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.status !== 'paused') return false;

    subscription.status = 'active';
    this.emit('subscription:resumed', { subscriptionId });
    return true;
  }

  updateSubscriptionFilters(subscriptionId: string, filters: Partial<SubscriptionFilter>): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.filters = { ...subscription.filters, ...filters };
    this.emit('subscription:updated', { subscriptionId, filters: subscription.filters });
    return true;
  }

  getSubscriptions(clientId?: string): StreamSubscription[] {
    if (clientId) {
      const subs = this.clientSubscriptions.get(clientId);
      if (!subs) return [];
      return Array.from(subs)
        .map(id => this.subscriptions.get(id))
        .filter((s): s is StreamSubscription => s !== undefined);
    }
    return Array.from(this.subscriptions.values());
  }

  getSubscriptionsByType(type: SubscriptionType): StreamSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.type === type && s.status === 'active');
  }

  // -------------------------------------------------------------------------
  // Data Publishing
  // -------------------------------------------------------------------------

  async publish(message: Omit<StreamMessage, 'id' | 'sequence' | 'timestamp'>): Promise<number> {
    const fullMessage: StreamMessage = {
      ...message,
      id: uuidv4(),
      sequence: ++this.sequenceNumber,
      timestamp: new Date(),
    };

    this.metrics.totalMessagesPublished++;

    // Add to publish buffer
    this.publishBuffer.push(fullMessage);

    // Check buffer size
    if (this.publishBuffer.length >= this.config.buffer.maxSize) {
      await this.handleBackpressure();
    }

    // Flush immediately if batch is full
    if (this.publishBuffer.length >= this.config.buffer.batchSize) {
      await this.flushPublishBuffer();
    }

    return fullMessage.sequence;
  }

  async publishToDevice(
    deviceId: string,
    capabilityId: string,
    data: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<number> {
    return this.publish({
      type: 'device_data',
      deviceId,
      capabilityId,
      data,
      metadata,
    });
  }

  async publishDeviceStatus(
    deviceId: string,
    status: string,
    metadata: Record<string, unknown> = {}
  ): Promise<number> {
    return this.publish({
      type: 'device_status',
      deviceId,
      data: { status },
      metadata,
    });
  }

  async publishAlert(
    alertType: string,
    data: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<number> {
    return this.publish({
      type: 'alert',
      data: { alertType, ...data as Record<string, unknown> },
      metadata,
    });
  }

  private async flushPublishBuffer(): Promise<void> {
    if (this.publishBuffer.length === 0) return;

    const messages = [...this.publishBuffer];
    this.publishBuffer = [];

    // Deduplicate if enabled
    let filteredMessages = messages;
    if (this.config.buffer.deduplicate) {
      filteredMessages = this.deduplicateMessages(messages);
    }

    // Sort by priority if needed
    if (this.config.buffer.priority === 'priority') {
      filteredMessages.sort((a, b) => {
        const priorityA = (a.metadata.priority as number) || 0;
        const priorityB = (b.metadata.priority as number) || 0;
        return priorityB - priorityA;
      });
    }

    // Deliver to subscribers
    let deliveredCount = 0;
    let droppedCount = 0;

    for (const message of filteredMessages) {
      const matchingSubscriptions = this.findMatchingSubscriptions(message);

      for (const subscription of matchingSubscriptions) {
        const client = this.clients.get(subscription.clientId);
        if (!client || client.status !== 'connected') {
          subscription.messagesFailed++;
          droppedCount++;
          continue;
        }

        // Rate limiting
        if (subscription.filters.maxRate) {
          const timeSinceLastActive = Date.now() - subscription.lastActiveAt.getTime();
          const minInterval = 1000 / subscription.filters.maxRate;
          if (timeSinceLastActive < minInterval) {
            continue;
          }
        }

        // Min interval
        if (subscription.filters.minInterval) {
          const timeSinceLastActive = Date.now() - subscription.lastActiveAt.getTime();
          if (timeSinceLastActive < subscription.filters.minInterval) {
            continue;
          }
        }

        // Send to client
        const success = await client.send(message);
        if (success) {
          subscription.messagesSent++;
          subscription.lastActiveAt = new Date();
          deliveredCount++;
          this.metrics.totalMessagesDelivered++;
          this.metrics.byProtocol[subscription.protocol].messages++;
          this.metrics.bySubscriptionType[subscription.type].messages++;
        } else {
          subscription.messagesFailed++;
          droppedCount++;
          this.metrics.totalMessagesDropped++;
        }
      }
    }

    // Update buffer metrics
    this.metrics.bufferUtilization = this.publishBuffer.length / this.config.buffer.maxSize;
  }

  private findMatchingSubscriptions(message: StreamMessage): StreamSubscription[] {
    const result: StreamSubscription[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (subscription.status !== 'active') continue;

      // Match type
      if (message.type === 'device_data' && subscription.type === SubscriptionType.DEVICE_DATA) {
        if (this.matchesFilter(message, subscription.filters)) {
          result.push(subscription);
        }
      } else if (message.type === 'device_status' && subscription.type === SubscriptionType.DEVICE_STATUS) {
        if (message.deviceId && subscription.filters.deviceIds?.includes(message.deviceId)) {
          result.push(subscription);
        }
      } else if (message.type === 'alert' && subscription.type === SubscriptionType.ALERTS) {
        result.push(subscription);
      } else if (message.type === 'aggregated' && subscription.type === SubscriptionType.AGGREGATED) {
        if (this.matchesFilter(message, subscription.filters)) {
          result.push(subscription);
        }
      } else if (subscription.type === SubscriptionType.CUSTOM) {
        result.push(subscription);
      }
    }

    return result;
  }

  private matchesFilter(message: StreamMessage, filters: SubscriptionFilter): boolean {
    if (filters.deviceIds && message.deviceId && !filters.deviceIds.includes(message.deviceId)) {
      return false;
    }

    if (filters.capabilityIds && message.capabilityId && !filters.capabilityIds.includes(message.capabilityId)) {
      return false;
    }

    if (filters.tags && message.metadata.tags) {
      const messageTags = message.metadata.tags as string[];
      const hasMatchingTag = filters.tags.some(tag => messageTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    if (filters.qualityThreshold !== undefined) {
      const quality = message.metadata.quality as number;
      if (quality !== undefined && quality < filters.qualityThreshold) {
        return false;
      }
    }

    return true;
  }

  private deduplicateMessages(messages: StreamMessage[]): StreamMessage[] {
    const result: StreamMessage[] = [];
    const now = Date.now();

    for (const message of messages) {
      const key = `${message.deviceId}:${message.capabilityId}:${JSON.stringify(message.data)}`;
      const hash = createHash('md5').update(key).digest('hex');

      const lastSeen = this.messageHashes.get(hash);
      if (lastSeen && now - lastSeen < this.config.buffer.deduplicateWindow) {
        continue; // Skip duplicate
      }

      this.messageHashes.set(hash, now);
      result.push(message);
    }

    // Cleanup old hashes
    const cutoff = now - this.config.buffer.deduplicateWindow;
    for (const [hash, timestamp] of this.messageHashes) {
      if (timestamp < cutoff) {
        this.messageHashes.delete(hash);
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Backpressure Handling
  // -------------------------------------------------------------------------

  private async handleBackpressure(): Promise<void> {
    if (!this.config.backpressure.enabled) return;

    const bufferUsage = this.publishBuffer.length;

    if (bufferUsage >= this.config.backpressure.highWaterMark) {
      this.emit('backpressure:high', { bufferUsage, threshold: this.config.backpressure.highWaterMark });

      switch (this.config.backpressure.dropStrategy) {
        case 'drop_olestic': {
          const dropCount = bufferUsage - this.config.backpressure.lowWaterMark;
          this.publishBuffer = this.publishBuffer.slice(dropCount);
          this.metrics.totalMessagesDropped += dropCount;
          break;
        }

        case 'drop_newest': {
          const keepCount = this.config.backpressure.lowWaterMark;
          this.publishBuffer = this.publishBuffer.slice(0, keepCount);
          this.metrics.totalMessagesDropped += bufferUsage - keepCount;
          break;
        }

        case 'drop_all': {
          const dropped = this.publishBuffer.length;
          this.publishBuffer = [];
          this.metrics.totalMessagesDropped += dropped;
          break;
        }

        case 'block': {
          // Wait for buffer to drain
          await new Promise<void>(resolve => {
            const checkInterval = setInterval(() => {
              if (this.publishBuffer.length <= this.config.backpressure.lowWaterMark) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
          break;
        }
      }

      // Alert if too many drops
      if (this.metrics.totalMessagesDropped > this.config.backpressure.alertThreshold) {
        this.emit('backpressure:alert', {
          totalDropped: this.metrics.totalMessagesDropped,
          threshold: this.config.backpressure.alertThreshold,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // MQTT Integration
  // -------------------------------------------------------------------------

  async connectMqtt(config?: MqttBrokerConfig): Promise<boolean> {
    const mqttConfig = config || this.config.mqtt;
    if (!mqttConfig) {
      throw new Error('MQTT configuration not provided');
    }

    // Simulate MQTT connection
    this.mqttConnected = true;

    this.emit('mqtt:connected', { host: mqttConfig.host, port: mqttConfig.port });

    // Subscribe to configured topics
    if (mqttConfig.will) {
      this.emit('mqtt:will_set', mqttConfig.will);
    }

    return true;
  }

  disconnectMqtt(): void {
    this.mqttConnected = false;
    this.mqttSubscriptions.clear();
    this.emit('mqtt:disconnected', {});
  }

  async subscribeMqtt(topic: string, callback: (message: StreamMessage) => void): Promise<void> {
    if (!this.mqttConnected) {
      throw new Error('MQTT not connected');
    }

    this.mqttSubscriptions.set(topic, callback);
    this.emit('mqtt:subscribed', { topic });
  }

  async unsubscribeMqtt(topic: string): Promise<void> {
    this.mqttSubscriptions.delete(topic);
    this.emit('mqtt:unsubscribed', { topic });
  }

  async publishMqtt(topic: string, payload: unknown, qos: 0 | 1 | 2 = 1, retain = false): Promise<void> {
    if (!this.mqttConnected) {
      throw new Error('MQTT not connected');
    }

    const message: StreamMessage = {
      id: uuidv4(),
      type: 'mqtt',
      data: payload,
      timestamp: new Date(),
      sequence: ++this.sequenceNumber,
      metadata: { topic, qos, retain },
    };

    // Deliver to matching MQTT subscriptions
    for (const [subscribedTopic, callback] of this.mqttSubscriptions) {
      if (this.mqttTopicMatches(topic, subscribedTopic)) {
        try {
          callback(message);
        } catch (error) {
          console.error(`MQTT callback error for topic ${subscribedTopic}:`, error);
        }
      }
    }

    this.emit('mqtt:published', { topic, qos, retain });
  }

  private mqttTopicMatches(topic: string, pattern: string): boolean {
    // Simple MQTT topic matching with wildcards
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return topicParts.length === patternParts.length;
  }

  // -------------------------------------------------------------------------
  // Real-Time Subscriptions
  // -------------------------------------------------------------------------

  createRealtimeSubscription(
    clientId: string,
    deviceId: string,
    capabilityIds: string[],
    callback: (data: unknown) => void
  ): string {
    const subscription = this.subscribe(
      clientId,
      SubscriptionType.DEVICE_DATA,
      {
        deviceIds: [deviceId],
        capabilityIds,
      }
    );

    this.on('data:forward', (message: StreamMessage) => {
      if (message.deviceId === deviceId && capabilityIds.includes(message.capabilityId || '')) {
        callback(message.data);
      }
    });

    return subscription.id;
  }

  // -------------------------------------------------------------------------
  // Heartbeat
  // -------------------------------------------------------------------------

  private sendHeartbeats(): void {
    const now = new Date();

    for (const client of this.clients.values()) {
      if (client.status !== 'connected') continue;

      const timeSinceLastActivity = now.getTime() - client.lastActivityAt.getTime();

      if (timeSinceLastActivity > this.config.heartbeatInterval * 2) {
        // Client might be disconnected
        client.status = 'reconnecting';
        this.emit('client:timeout', { clientId: client.id });
        continue;
      }

      // Send heartbeat
      const heartbeat: StreamMessage = {
        id: uuidv4(),
        type: 'heartbeat',
        data: { timestamp: now, sequenceNumber: this.sequenceNumber },
        timestamp: now,
        sequence: ++this.sequenceNumber,
        metadata: { serverTime: now.toISOString() },
      };

      client.send(heartbeat).catch(() => {
        // Heartbeat failed
      });
    }
  }

  // -------------------------------------------------------------------------
  // Data Forwarding
  // -------------------------------------------------------------------------

  async forwardData(
    deviceId: string,
    capabilityId: string,
    data: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const message: StreamMessage = {
      id: uuidv4(),
      type: 'device_data',
      deviceId,
      capabilityId,
      data,
      timestamp: new Date(),
      sequence: ++this.sequenceNumber,
      metadata,
    };

    this.emit('data:forward', message);
    await this.publish(message);
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  private updateMetrics(): void {
    this.metrics.totalClients = this.clients.size;
    this.metrics.activeClients = Array.from(this.clients.values()).filter(c => c.status === 'connected').length;
    this.metrics.totalSubscriptions = this.subscriptions.size;
    this.metrics.activeSubscriptions = Array.from(this.subscriptions.values()).filter(s => s.status === 'active').length;
    this.metrics.bufferUtilization = this.publishBuffer.length / this.config.buffer.maxSize;

    // Calculate rates
    const now = Date.now();
    const recentMessages = Array.from(this.subscriptions.values())
      .reduce((sum, s) => sum + s.messagesSent, 0);
    this.metrics.publishRate = recentMessages / (this.config.metricsInterval / 1000);
    this.metrics.deliveryRate = this.metrics.totalMessagesDelivered / (this.config.metricsInterval / 1000);
    this.metrics.dropRate = this.metrics.totalMessagesDropped / (this.config.metricsInterval / 1000);

    // Calculate average latency
    const latencies = Array.from(this.clients.values())
      .filter(c => c.latencyMs > 0)
      .map(c => c.latencyMs);
    if (latencies.length > 0) {
      this.metrics.averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      this.metrics.maxLatencyMs = Math.max(...latencies);
    }

    this.emit('metrics:updated', this.metrics);
  }

  getMetrics(): StreamingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  getBufferSize(): number {
    return this.publishBuffer.length;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getActiveClientCount(): number {
    return Array.from(this.clients.values()).filter(c => c.status === 'connected').length;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  async flush(): Promise<void> {
    await this.flushPublishBuffer();
  }
}

// Singleton instance
let streamingInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingInstance) {
    streamingInstance = new StreamingService();
  }
  return streamingInstance;
}

export default StreamingService;
