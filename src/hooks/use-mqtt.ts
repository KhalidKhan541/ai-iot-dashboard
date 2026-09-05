"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface MQTTConfig {
  broker: string;
  port?: number;
  clientId?: string;
  username?: string;
  password?: string;
  protocol?: "mqtt" | "mqtts" | "ws" | "wss";
  keepalive?: number;
  clean?: boolean;
}

interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: number;
}

type MQTTCallback = (message: MQTTMessage) => void;

interface UseMQTTOptions extends MQTTConfig {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: MQTTMessage) => void;
}

interface UseMQTTResult {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publish: (topic: string, payload: string | object, options?: { qos?: 0 | 1 | 2; retain?: boolean }) => Promise<void>;
  subscribe: (topic: string, callback: MQTTCallback, qos?: 0 | 1 | 2) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
  messages: MQTTMessage[];
  lastMessage: MQTTMessage | null;
  clearMessages: () => void;
}

export function useMQTT(options: UseMQTTOptions): UseMQTTResult {
  const {
    broker,
    port,
    clientId,
    username,
    password,
    protocol = "mqtt",
    keepalive = 60,
    clean = true,
    enabled = true,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<MQTTMessage | null>(null);

  const clientRef = useRef<unknown>(null);
  const subscriptionsRef = useRef<Map<string, MQTTCallback>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef({ onConnect, onDisconnect, onError, onMessage });
  callbacksRef.current = { onConnect, onDisconnect, onError, onMessage };

  const generateClientId = useCallback(() => {
    return (
      clientId ??
      `mqtt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    );
  }, [clientId]);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setConnectionStatus("connecting");
    setError(null);

    try {
      const wsUrl = `${protocol === "mqtts" ? "wss" : "ws"}://${broker}:${port ?? (protocol === "mqtts" ? 8884 : 8083)}/mqtt`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as MQTTMessage;
          setLastMessage(parsed);
          setMessages((prev) => [...prev.slice(-99), parsed]);
          callbacksRef.current.onMessage?.(parsed);

          const callback = subscriptionsRef.current.get(parsed.topic);
          if (callback) {
            callback(parsed);
          }

          for (const [pattern, cb] of subscriptionsRef.current) {
            if (pattern.includes("#") || pattern.includes("+")) {
              if (matchTopic(pattern, parsed.topic)) {
                cb(parsed);
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        const error = new Error("WebSocket connection error");
        setError(error);
        setConnectionStatus("error");
        setIsConnecting(false);
        callbacksRef.current.onError?.(error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus("disconnected");
        callbacksRef.current.onDisconnect?.();

        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      clientRef.current = ws;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Connection failed");
      setError(error);
      setConnectionStatus("error");
      setIsConnecting(false);
      callbacksRef.current.onError?.(error);
    }
  }, [
    broker,
    port,
    protocol,
    clientId,
    isConnected,
    isConnecting,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  const disconnect = useCallback(async () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectAttemptsRef.current = maxReconnectAttempts;

    const ws = clientRef.current as WebSocket | null;
    if (ws) {
      ws.close();
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    callbacksRef.current.onDisconnect?.("client disconnect");
  }, [maxReconnectAttempts]);

  const publish = useCallback(
    async (
      topic: string,
      payload: string | object,
      pubOptions?: { qos?: 0 | 1 | 2; retain?: boolean }
    ) => {
      const ws = clientRef.current as WebSocket | null;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("Not connected");
      }

      const message = {
        topic,
        payload: typeof payload === "object" ? JSON.stringify(payload) : payload,
        qos: pubOptions?.qos ?? 1,
        retain: pubOptions?.retain ?? false,
      };

      ws.send(JSON.stringify(message));
    },
    []
  );

  const subscribe = useCallback(
    async (topic: string, callback: MQTTCallback, qos: 0 | 1 | 2 = 1) => {
      subscriptionsRef.current.set(topic, callback);

      const ws = clientRef.current as WebSocket | null;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "subscribe", topic, qos }));
      }
    },
    []
  );

  const unsubscribe = useCallback(async (topic: string) => {
    subscriptionsRef.current.delete(topic);

    const ws = clientRef.current as WebSocket | null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    error,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    messages,
    lastMessage,
    clearMessages,
  };
}

function matchTopic(pattern: string, topic: string): boolean {
  const patternParts = pattern.split("/");
  const topicParts = topic.split("/");

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "#") return true;
    if (patternParts[i] === "+") continue;
    if (patternParts[i] !== topicParts[i]) return false;
  }

  return patternParts.length === topicParts.length;
}
