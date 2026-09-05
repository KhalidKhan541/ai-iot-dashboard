"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface RealtimeDataPoint {
  timestamp: number;
  value: number;
  deviceId: string;
  sensorId: string;
  quality?: "good" | "uncertain" | "bad";
}

interface UseRealtimeDataOptions {
  maxDataPoints?: number;
  enabled?: boolean;
  onMessage?: (data: RealtimeDataPoint) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseRealtimeDataResult {
  data: RealtimeDataPoint[];
  latestValue: RealtimeDataPoint | null;
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  clearData: () => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

export function useRealtimeData(
  url: string,
  options?: UseRealtimeDataOptions
): UseRealtimeDataResult {
  const {
    maxDataPoints = 100,
    enabled = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options ?? {};

  const [data, setData] = useState<RealtimeDataPoint[]>([]);
  const [latestValue, setLatestValue] = useState<RealtimeDataPoint | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef({ onMessage, onError, onConnect, onDisconnect });
  callbacksRef.current = { onMessage, onError, onConnect, onDisconnect };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeDataPoint;
          setLatestValue(parsed);
          setData((prev) => [...prev, parsed].slice(-maxDataPoints));
          callbacksRef.current.onMessage?.(parsed);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        const error = new Error("WebSocket error");
        setError(error);
        setConnectionStatus("error");
        callbacksRef.current.onError?.(error);
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        callbacksRef.current.onDisconnect?.();

        if (
          enabled &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to connect");
      setError(error);
      setConnectionStatus("error");
      callbacksRef.current.onError?.(error);
    }
  }, [url, enabled, maxDataPoints, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectAttemptsRef.current = maxReconnectAttempts;
    wsRef.current?.close();
    setConnectionStatus("disconnected");
  }, [maxReconnectAttempts]);

  const clearData = useCallback(() => {
    setData([]);
    setLatestValue(null);
  }, []);

  const subscribe = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", topic }));
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
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
    data,
    latestValue,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    error,
    connect,
    disconnect,
    clearData,
    subscribe,
    unsubscribe,
  };
}

export function useRealtimeDeviceData(
  deviceId: string,
  sensorIds?: string[],
  options?: UseRealtimeDataOptions
): UseRealtimeDataResult {
  const url = sensorIds && sensorIds.length > 0
    ? `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"}/devices/${deviceId}/sensors/${sensorIds.join(",")}`
    : `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"}/devices/${deviceId}`;

  return useRealtimeData(url, options);
}

export function useRealtimeMetrics(
  url: string,
  options?: UseRealtimeDataOptions & {
    aggregateWindow?: number;
  }
): UseRealtimeDataResult & {
  metrics: {
    avg: number;
    min: number;
    max: number;
    count: number;
    sum: number;
  };
} {
  const result = useRealtimeData(url, options);
  const { aggregateWindow = 60000 } = options ?? {};

  const metrics = {
    avg: 0,
    min: 0,
    max: 0,
    count: 0,
    sum: 0,
  };

  if (result.data.length > 0) {
    const now = Date.now();
    const recentData = result.data.filter(
      (d) => now - d.timestamp <= aggregateWindow
    );

    if (recentData.length > 0) {
      const values = recentData.map((d) => d.value);
      metrics.sum = values.reduce((a, b) => a + b, 0);
      metrics.avg = metrics.sum / values.length;
      metrics.min = Math.min(...values);
      metrics.max = Math.max(...values);
      metrics.count = values.length;
    }
  }

  return { ...result, metrics };
}
