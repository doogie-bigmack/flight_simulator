/**
 * Network manager for handling WebSocket connections
 * Manages real-time communication between clients and server
 */
export class NetworkManager {
  /**
   * Initialize the network manager
   * @param {Object} options - Configuration options
   * @param {string} options.serverUrl - WebSocket server URL
   * @param {function} options.onConnect - Callback when connection is established
   * @param {function} options.onDisconnect - Callback when connection is lost
   * @param {function} options.onError - Callback when error occurs
   */
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || this.getDefaultServerUrl();
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.autoReconnect = options.autoReconnect !== false;
    this.eventHandlers = new Map();
    
    // Callbacks
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
    this.onError = options.onError || (() => {});
    
    // Initialize JSON logger
    this.logger = {
      info: (message, data = {}) => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'NetworkManager',
          message,
          ...data
        }));
      },
      error: (message, data = {}) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          component: 'NetworkManager',
          message,
          ...data
        }));
      }
    };
  }
  
  /**
   * Get default server URL based on current location
   * @returns {string} Default server URL
   */
  getDefaultServerUrl() {
    if (typeof window === 'undefined') return 'ws://localhost:8000';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    
    return `${protocol}//${host}:${port}`;
  }
  
  /**
   * Connect to WebSocket server
   * @returns {Promise} Promise resolving when connected
   */
  connect() {
    if (this.socket && this.connected) {
      this.logger.info('Already connected');
      return Promise.resolve(this.socket);
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.logger.info('Connecting to server', { url: this.serverUrl });
        
        // Create WebSocket connection
        this.socket = new WebSocket(this.serverUrl);
        
        // Set up event handlers
        this.socket.onopen = () => this.handleOpen(resolve);
        this.socket.onclose = (event) => this.handleClose(event);
        this.socket.onerror = (error) => this.handleError(error, reject);
        this.socket.onmessage = (event) => this.handleMessage(event);
        
      } catch (error) {
        this.logger.error('Connection error', { error: error.message });
        reject(error);
        this.onError(error);
      }
    });
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (!this.socket) return;
    
    this.logger.info('Disconnecting from server');
    this.autoReconnect = false;
    this.socket.close();
  }
  
  /**
   * Send data to the server
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   * @returns {boolean} Success state
   */
  send(event, data = {}) {
    if (!this.socket || !this.connected) {
      this.logger.error('Cannot send data, not connected');
      return false;
    }
    
    try {
      const payload = JSON.stringify({
        event,
        data
      });
      
      this.socket.send(payload);
      this.logger.info('Data sent', { event, dataSize: JSON.stringify(data).length });
      return true;
    } catch (error) {
      this.logger.error('Failed to send data', { error: error.message, event });
      return false;
    }
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event).push(callback);
    this.logger.info('Event handler registered', { event });
  }
  
  /**
   * Remove an event handler
   * @param {string} event - Event name
   * @param {function} callback - Event callback to remove
   */
  off(event, callback) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(callback);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.logger.info('Event handler removed', { event });
    }
    
    if (handlers.length === 0) {
      this.eventHandlers.delete(event);
    }
  }
  
  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Handle WebSocket open event
   * @param {function} resolve - Promise resolve function
   */
  handleOpen(resolve) {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.logger.info('Connected to server');
    this.onConnect(this.socket);
    resolve(this.socket);
  }
  
  /**
   * Handle WebSocket close event
   * @param {Event} event - Close event
   */
  handleClose(event) {
    this.connected = false;
    this.logger.info('Disconnected from server', { 
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    this.onDisconnect(event);
    
    // Attempt to reconnect if enabled
    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.info('Attempting to reconnect', { 
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }
  
  /**
   * Handle WebSocket error event
   * @param {Error} error - Error object
   * @param {function} reject - Promise reject function
   */
  handleError(error, reject) {
    this.logger.error('WebSocket error', { error: error.message });
    this.onError(error);
    
    if (reject) {
      reject(error);
    }
  }
  
  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const eventName = message.event;
      const data = message.data;
      
      // Log received message
      this.logger.info('Message received', { 
        event: eventName,
        dataSize: JSON.stringify(data).length
      });
      
      // Call registered event handlers
      if (this.eventHandlers.has(eventName)) {
        const handlers = this.eventHandlers.get(eventName);
        handlers.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            this.logger.error('Error in event handler', { 
              event: eventName,
              error: error.message
            });
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse message', { error: error.message });
    }
  }
  
  /**
   * Set up ping/pong for keeping the connection alive
   * @param {number} interval - Ping interval in milliseconds
   */
  setupHeartbeat(interval = 30000) {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    this._heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send('ping', { timestamp: Date.now() });
      } else {
        clearInterval(this._heartbeatInterval);
      }
    }, interval);
    
    // Add handler for pong messages
    this.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      this.logger.info('Heartbeat', { latency });
    });
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    this.disconnect();
    this.eventHandlers.clear();
    this.socket = null;
  }
}
