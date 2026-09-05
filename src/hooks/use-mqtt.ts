"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { MqttClient, IClientOptions, IClientPublishOptions } from "mqtt";

export type MqttConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export interface MqttMessage {
  topic: string;
  message: Buffer;
  timestamp: Date;
}

interface UseMqttOptions {
  brokerUrl: string;
  options?: IClientOptions;
  autoConnect?: boolean;
  topics?: string[];
  onMessage?: (topic: string, message: Buffer) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseMqttReturn {
  client: MqttClient | null;
  status: MqttConnectionStatus;
  messages: MqttMessage[];
  lastMessage: MqttMessage | null;
  connect: () => void;
  disconnect: () => void;
  publish: (topic: string, message: string | Buffer, options?: IClientPublishOptions) => void;
  subscribe: (topic: string | string[]) => void;
  unsubscribe: (topic: string | string[]) => void;
  clearMessages: () => void;
}

export function useMqtt({
  brokerUrl,
  options = {},
  autoConnect = true,
  topics = [],
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseMqttOptions): UseMqttReturn {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [status, setStatus] = useState<MqttConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<MqttMessage | null>(null);
  const clientRef = useRef<MqttClient | null>(null);
  const mountedRef = useRef(true);

  const handleConnect = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus("connected");
    onConnect?.();
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus("disconnected");
    onDisconnect?.();
  }, [onDisconnect]);

  const handleError = useCallback(
    (error: Error) => {
      if (!mountedRef.current) return;
      setStatus("error");
      onError?.(error);
    },
    [onError]
  );

  const handleMessage = useCallback(
    (topic: string, message: Buffer) => {
      if (!mountedRef.current) return;
      const msg: MqttMessage = {
        topic,
        message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.slice(-99), msg]);
      setLastMessage(msg);
      onMessage?.(topic, message);
    },
    [onMessage]
  );

  const handleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus("reconnecting");
  }, []);

  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
    }

    setStatus("connecting");

    const mqttClient = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      clean: true,
      ...options,
    });

    mqttClient.on("connect", handleConnect);
    mqttClient.on("disconnect", handleDisconnect);
    mqttClient.on("error", handleError);
    mqttClient.on("message", handleMessage);
    mqttClient.on("reconnect", handleReconnect);

    clientRef.current = mqttClient;
    setClient(mqttClient);
  }, [
    brokerUrl,
    options,
    handleConnect,
    handleDisconnect,
    handleError,
    handleMessage,
    handleReconnect,
  ]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      setClient(null);
      setStatus("disconnected");
    }
  }, []);

  const publish = useCallback(
    (topic: string, message: string | Buffer, options?: IClientPublishOptions) => {
      if (clientRef.current?.connected) {
        clientRef.current.publish(topic, message, options);
      }
    },
    []
  );

  const subscribe = useCallback((topic: string | string[]) => {
    if (clientRef.current?.connected) {
      clientRef.current.subscribe(topic);
    }
  }, []);

  const unsubscribe = useCallback((topic: string | string[]) => {
    if (clientRef.current?.connected) {
      clientRef.current.unsubscribe(topic);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect]);

  useEffect(() => {
    if (status === "connected" && topics.length > 0) {
      subscribe(topics);
    }
  }, [status, topics, subscribe]);

  return {
    client,
    status,
    messages,
    lastMessage,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    clearMessages,
  };
}
