export interface MQTTConfig {
  broker: string;
  port?: number;
  clientId?: string;
  username?: string;
  password?: string;
  keepalive?: number;
  clean?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  protocol?: "mqtt" | "mqtts" | "ws" | "wss";
  qos?: 0 | 1 | 2;
  will?: {
    topic: string;
    payload: string;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  };
}

export interface MQTTMessage {
  topic: string;
  payload: string | Buffer;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: number;
}

export type MQTTCallback = (message: MQTTMessage) => void;
export type MQTTErrorCallback = (error: Error) => void;
export type MQTTConnectCallback = () => void;
export type MQTTDisconnectCallback = (reason?: string) => void;

export interface MQTTSubscription {
  topic: string;
  qos: 0 | 1 | 2;
  callback: MQTTCallback;
}

interface MQTTClientState {
  connected: boolean;
  reconnecting: boolean;
  subscriptions: Map<string, MQTTSubscription>;
  messageCount: number;
  lastMessage?: MQTTMessage;
  lastConnectTime?: number;
  lastDisconnectTime?: number;
}

export class MQTTClient {
  private config: Required<MQTTConfig>;
  private state: MQTTClientState;
  private connectCallbacks: MQTTConnectCallback[] = [];
  private disconnectCallbacks: MQTTDisconnectCallback[] = [];
  private errorCallbacks: MQTTErrorCallback[] = [];
  private messageHandlers = new Map<string, MQTTCallback[]>();
  private wildcardHandlers: Array<{ pattern: string; callback: MQTTCallback }> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: MQTTConfig) {
    this.config = {
      port: 1883,
      clientId: `mqtt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 10000,
      protocol: "mqtt",
      qos: 1,
      ...config,
    };

    this.state = {
      connected: false,
      reconnecting: false,
      subscriptions: new Map(),
      messageCount: 0,
    };
  }

  async connect(): Promise<void> {
    if (this.state.connected) return;

    try {
      this.state.connected = true;
      this.state.lastConnectTime = Date.now();
      this.state.reconnecting = false;

      this.startKeepalive();

      for (const callback of this.connectCallbacks) {
        callback();
      }

      await this.resubscribe();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error("Connection failed"));
      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    if (!this.state.connected) return;

    this.state.connected = false;
    this.state.reconnecting = false;
    this.state.lastDisconnectTime = Date.now();

    this.stopKeepalive();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const callback of this.disconnectCallbacks) {
      callback("client disconnect");
    }
  }

  async publish(
    topic: string,
    payload: string | Buffer,
    options?: { qos?: 0 | 1 | 2; retain?: boolean }
  ): Promise<void> {
    if (!this.state.connected) {
      throw new Error("Client not connected");
    }

    const message: MQTTMessage = {
      topic,
      payload,
      qos: options?.qos ?? this.config.qos,
      retain: options?.retain ?? false,
      timestamp: Date.now(),
    };

    this.state.lastMessage = message;
    this.state.messageCount++;
  }

  async subscribe(
    topic: string,
    callback: MQTTCallback,
    qos?: 0 | 1 | 2
  ): Promise<void> {
    const subscription: MQTTSubscription = {
      topic,
      qos: qos ?? this.config.qos,
      callback,
    };

    this.state.subscriptions.set(topic, subscription);

    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, []);
    }
    this.messageHandlers.get(topic)!.push(callback);

    if (this.isWildcardTopic(topic)) {
      this.wildcardHandlers.push({ pattern: topic, callback });
    }

    if (this.state.connected) {
      this.sendSubscribePacket(topic, qos ?? this.config.qos);
    }
  }

  async unsubscribe(topic: string, callback?: MQTTCallback): Promise<void> {
    this.state.subscriptions.delete(topic);

    if (callback) {
      const handlers = this.messageHandlers.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(callback);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    } else {
      this.messageHandlers.delete(topic);
    }

    this.wildcardHandlers = this.wildcardHandlers.filter(
      (h) => h.pattern !== topic || (callback && h.callback !== callback)
    );

    if (this.state.connected) {
      this.sendUnsubscribePacket(topic);
    }
  }

  onConnect(callback: MQTTConnectCallback): () => void {
    this.connectCallbacks.push(callback);
    return () => {
      const idx = this.connectCallbacks.indexOf(callback);
      if (idx !== -1) this.connectCallbacks.splice(idx, 1);
    };
  }

  onDisconnect(callback: MQTTDisconnectCallback): () => void {
    this.disconnectCallbacks.push(callback);
    return () => {
      const idx = this.disconnectCallbacks.indexOf(callback);
      if (idx !== -1) this.disconnectCallbacks.splice(idx, 1);
    };
  }

  onError(callback: MQTTErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const idx = this.errorCallbacks.indexOf(callback);
      if (idx !== -1) this.errorCallbacks.splice(idx, 1);
    };
  }

  onMessage(callback: MQTTCallback): () => void {
    this.messageHandlers.set("*", [
      ...(this.messageHandlers.get("*") ?? []),
      callback,
    ]);
    return () => {
      const handlers = this.messageHandlers.get("*");
      if (handlers) {
        const idx = handlers.indexOf(callback);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const message: MQTTMessage = {
      topic,
      payload: payload.toString(),
      qos: 0,
      retain: false,
      timestamp: Date.now(),
    };

    this.state.lastMessage = message;
    this.state.messageCount++;

    const handlers = this.messageHandlers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error("Message handler error")
          );
        }
      }
    }

    for (const { pattern, callback } of this.wildcardHandlers) {
      if (this.matchTopic(pattern, topic)) {
        try {
          callback(message);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error("Wildcard handler error")
          );
        }
      }
    }

    const starHandlers = this.messageHandlers.get("*");
    if (starHandlers) {
      for (const handler of starHandlers) {
        try {
          handler(message);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error("Star handler error")
          );
        }
      }
    }
  }

  private isWildcardTopic(topic: string): boolean {
    return topic.includes("#") || topic.includes("+");
  }

  private matchTopic(pattern: string, topic: string): boolean {
    const patternParts = pattern.split("/");
    const topicParts = topic.split("/");

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "#") return true;
      if (patternParts[i] === "+") continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  private async resubscribe(): Promise<void> {
    for (const [, subscription] of this.state.subscriptions) {
      this.sendSubscribePacket(subscription.topic, subscription.qos);
    }
  }

  private sendSubscribePacket(topic: string, qos: 0 | 1 | 2): void {
    // In a real implementation, this would send an MQTT SUBSCRIBE packet
  }

  private sendUnsubscribePacket(topic: string): void {
    // In a real implementation, this would send an MQTT UNSUBSCRIBE packet
  }

  private sendPingreq(): void {
    // In a real implementation, this would send an MQTT PINGREQ packet
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    if (this.config.keepalive > 0) {
      this.keepaliveTimer = setInterval(() => {
        if (this.state.connected) {
          this.sendPingreq();
        }
      }, this.config.keepalive * 1000);
    }
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.state.reconnecting) return;

    this.state.reconnecting = true;
    this.reconnectTimer = setTimeout(() => {
      this.state.reconnecting = false;
      this.connect();
    }, this.config.reconnectPeriod);
  }

  private handleError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }

  getState(): MQTTClientState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  getSubscriptions(): MQTTSubscription[] {
    return Array.from(this.state.subscriptions.values());
  }

  getMessageCount(): number {
    return this.state.messageCount;
  }

  getLastMessage(): MQTTMessage | undefined {
    return this.state.lastMessage;
  }
}

export function createMQTTClient(config: MQTTConfig): MQTTClient {
  return new MQTTClient(config);
}

export interface DeviceMQTTConfig {
  deviceId: string;
  broker: string;
  port?: number;
  topicPrefix?: string;
}

export class DeviceMQTTManager {
  private clients = new Map<string, MQTTClient>();
  private config: DeviceMQTTConfig;

  constructor(config: DeviceMQTTConfig) {
    this.config = config;
  }

  async connectDevice(deviceId: string): Promise<MQTTClient> {
    if (this.clients.has(deviceId)) {
      return this.clients.get(deviceId)!;
    }

    const client = createMQTTClient({
      broker: this.config.broker,
      port: this.config.port,
      clientId: `device_${deviceId}_${Date.now().toString(36)}`,
      keepalive: 30,
    });

    await client.connect();
    this.clients.set(deviceId, client);

    return client;
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const client = this.clients.get(deviceId);
    if (client) {
      await client.disconnect();
      this.clients.delete(deviceId);
    }
  }

  async publishToDevice(
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    const topic = `${this.config.topicPrefix ?? "devices"}/${deviceId}/data`;
    await client.publish(topic, JSON.stringify(data));
  }

  async subscribeToDevice(
    deviceId: string,
    callback: (data: Record<string, unknown>) => void
  ): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    const topic = `${this.config.topicPrefix ?? "devices"}/${deviceId}/data`;
    await client.subscribe(topic, (message) => {
      try {
        const data = JSON.parse(message.payload.toString());
        callback(data);
      } catch {
        // Ignore parse errors
      }
    });
  }

  getConnectedDevices(): string[] {
    return Array.from(this.clients.entries())
      .filter(([, client]) => client.isConnected())
      .map(([deviceId]) => deviceId);
  }

  async disconnectAll(): Promise<void> {
    for (const [deviceId, client] of this.clients) {
      await client.disconnect();
      this.clients.delete(deviceId);
    }
  }
}

export const deviceMQTTManager = new DeviceMQTTManager({
  deviceId: "manager",
  broker: process.env.MQTT_BROKER ?? "mqtt://localhost",
  port: parseInt(process.env.MQTT_PORT ?? "1883", 10),
  topicPrefix: process.env.MQTT_TOPIC_PREFIX ?? "iot",
});
