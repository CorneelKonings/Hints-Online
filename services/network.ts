import { useEffect, useState, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { NetworkMessage } from '../types';

// Helper to generate a friendly 4-letter room code
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// PREFIX for PeerJS IDs to avoid collisions on public server
const APP_PREFIX = 'SPINGUESS_XMAS_';

// --- HOST HOOK ---
export const useHostNetwork = () => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [lastMessage, setLastMessage] = useState<NetworkMessage | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Generate code and create Peer
    const code = generateRoomCode();
    setRoomCode(code);
    
    const peer = new Peer(`${APP_PREFIX}${code}`);
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('Host Peer ID:', id);
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        
        // Listen for data from this guest
        conn.on('data', (data: any) => {
          setLastMessage(data as NetworkMessage);
        });
      });

      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c !== conn));
      });
      
      conn.on('error', (err) => console.error("Conn error", err));
    });

    peer.on('error', (err) => {
      console.error("Peer error:", err);
      // If ID is taken, simple retry logic could go here, 
      // but collision on 4 random chars + prefix is rare enough for demo.
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const broadcast = useCallback((message: NetworkMessage) => {
    connections.forEach(conn => {
      if(conn.open) {
        conn.send(message);
      }
    });
  }, [connections]);

  return { roomCode, broadcast, lastMessage, connectionCount: connections.length };
};

// --- GUEST HOOK ---
export const useGuestNetwork = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NetworkMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  const connectToRoom = (code: string, playerId: string) => {
    setError(null);
    if (peerRef.current) peerRef.current.destroy();

    // Guests don't need a specific ID, allow random
    const peer = new Peer(); 
    peerRef.current = peer;

    peer.on('open', () => {
      const hostId = `${APP_PREFIX}${code.toUpperCase()}`;
      const conn = peer.connect(hostId, {
        metadata: { playerId }
      });
      
      conn.on('open', () => {
        setIsConnected(true);
        connRef.current = conn;
      });

      conn.on('data', (data: any) => {
        setLastMessage(data as NetworkMessage);
      });

      conn.on('close', () => {
        setIsConnected(false);
        setError("Disconnected from Host");
      });

      conn.on('error', (err) => {
        console.error("Connection Error", err);
        setError("Could not connect. Check code.");
      });
    });

    peer.on('error', (err) => {
       console.error("Guest Peer Error", err);
       setError("Network error.");
    });
  };

  const send = (message: NetworkMessage) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(message);
    }
  };

  return { connectToRoom, send, lastMessage, isConnected, error };
};