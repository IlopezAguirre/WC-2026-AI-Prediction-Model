import { useEffect, useRef, useState } from 'react';
import type { Predictions } from '../types';

interface WsState {
  predictions: Predictions | null;
  connected: boolean;
}

export function useWebSocket(): WsState {
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    function connect(): void {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev: MessageEvent) => {
        try {
          setPredictions(JSON.parse(ev.data as string) as Predictions);
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { predictions, connected };
}
