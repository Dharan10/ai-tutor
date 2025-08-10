import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

// Create context
const RAGProcessContext = createContext({
  events: [],
  addEvent: () => {},
  clearEvents: () => {},
  sessionStartTimestamp: null,
  startNewSession: () => {},
  isConnected: false,
});

/**
 * RAGProcessProvider component
 * Provides context for tracking RAG process events
 */
export const RAGProcessProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState(Date.now());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Setup WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Get host from window location or use default
      const host = window.location.host || 'localhost:8000';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${host}/ws/rag_process`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Send ping to test connection
        ws.send(JSON.stringify({ type: 'ping' }));
        
        // Add connection event to log
        addEvent({
          message: 'Connected to RAG process server',
          type: 'info',
          phase: 'connection',
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different event types
          if (data.type === 'rag_event') {
            // Add event from server to our log
            addEvent({
              message: data.data.message,
              type: data.data.type || 'info',
              phase: data.data.phase || 'server',
              timestamp: data.data.timestamp || Date.now(),
            });
          }
          else if (data.type === 'pong') {
            console.log('Received pong from server');
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Add disconnection event to log
        addEvent({
          message: 'Disconnected from RAG process server',
          type: 'warning',
          phase: 'connection',
        });
        
        // Try to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addEvent({
          message: 'Error connecting to RAG process server',
          type: 'error',
          phase: 'connection',
        });
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Add a new event to the log
  const addEvent = (event) => {
    const newEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };
    setEvents(prev => [...prev, newEvent]);
    
    // Send event to server if connected and it's not a connection event
    if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN && 
        event.phase !== 'connection') {
      wsRef.current.send(JSON.stringify({
        type: 'client_event',
        data: newEvent
      }));
    }
  };

  // Clear all events
  const clearEvents = () => {
    setEvents([]);
  };

  // Start a new session - clear events and set new timestamp
  const startNewSession = () => {
    clearEvents();
    setSessionStartTimestamp(Date.now());
    addEvent({
      message: 'Starting new RAG session. Any previous documents will be cleared.',
      type: 'info',
      phase: 'session',
    });
    
    // Notify server about new session
    if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'new_session'
      }));
    }
  };

  return (
    <RAGProcessContext.Provider 
      value={{ 
        events, 
        addEvent, 
        clearEvents, 
        sessionStartTimestamp,
        startNewSession,
        isConnected
      }}
    >
      {children}
    </RAGProcessContext.Provider>
  );
};

// Custom hook to use the RAG process context
export const useRAGProcess = () => useContext(RAGProcessContext);

export default RAGProcessContext;
