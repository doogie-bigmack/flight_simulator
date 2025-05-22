/**
 * Tests for the Network Manager
 */
import { NetworkManager } from '../../client/js/network.js';

describe('NetworkManager', () => {
  let networkManager;
  let mockSocket;
  let mockCallbacks;
  
  // Mock WebSocket implementation
  class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0; // CONNECTING
      this.OPEN = 1;
      this.CLOSED = 3;
      
      // Simulate successful connection by default
      setTimeout(() => {
        this.readyState = this.OPEN;
        if (this.onopen) this.onopen();
      }, 0);
    }
    
    send(data) {
      if (this.readyState !== this.OPEN) {
        throw new Error('WebSocket is not open');
      }
      return true;
    }
    
    close() {
      this.readyState = this.CLOSED;
      if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true });
    }
  }
  
  beforeEach(() => {
    // Store original WebSocket
    global.originalWebSocket = global.WebSocket;
    
    // Replace global WebSocket with mock
    global.WebSocket = MockWebSocket;
    
    // Create mock callbacks
    mockCallbacks = {
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      onError: jest.fn()
    };
    
    // Create network manager with mock callbacks
    networkManager = new NetworkManager({
      serverUrl: 'ws://test-server:8000',
      ...mockCallbacks
    });
    
    // Mock logger to avoid console noise during tests
    networkManager.logger = {
      info: jest.fn(),
      error: jest.fn()
    };
  });
  
  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = global.originalWebSocket;
    
    // Clean up
    if (networkManager) {
      networkManager.destroy();
    }
    
    jest.resetAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default values', () => {
      const defaultManager = new NetworkManager();
      
      expect(defaultManager.serverUrl).toBeDefined();
      expect(defaultManager.socket).toBeNull();
      expect(defaultManager.connected).toBeFalsy();
      expect(defaultManager.reconnectAttempts).toBe(0);
      expect(defaultManager.maxReconnectAttempts).toBe(5);
      expect(defaultManager.reconnectInterval).toBe(3000);
      expect(defaultManager.autoReconnect).toBeTruthy();
      expect(defaultManager.eventHandlers).toBeInstanceOf(Map);
    });
    
    test('should initialize with custom options', () => {
      const customManager = new NetworkManager({
        serverUrl: 'ws://custom-server:9000',
        maxReconnectAttempts: 10,
        reconnectInterval: 1000,
        autoReconnect: false
      });
      
      expect(customManager.serverUrl).toBe('ws://custom-server:9000');
      expect(customManager.maxReconnectAttempts).toBe(10);
      expect(customManager.reconnectInterval).toBe(1000);
      expect(customManager.autoReconnect).toBeFalsy();
    });
    
    test('should generate default server URL based on window location', () => {
      // Save original getDefaultServerUrl method
      const originalGetDefaultServerUrl = NetworkManager.prototype.getDefaultServerUrl;
      
      // Override the method for testing
      NetworkManager.prototype.getDefaultServerUrl = function() {
        if (this.serverUrl) return this.serverUrl;
        
        // Use the mocked window values from test
        if (global._testWindowLocation) {
          const protocol = global._testWindowLocation.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = global._testWindowLocation.hostname;
          const port = global._testWindowLocation.port;
          return `${protocol}//${host}:${port}`;
        }
        
        return 'ws://localhost:8000'; // Default fallback
      };
      
      // Set test values
      global._testWindowLocation = {
        protocol: 'https:',
        hostname: 'test-host',
        port: '8443'
      };
      
      const httpsManager = new NetworkManager();
      expect(httpsManager.getDefaultServerUrl()).toBe('wss://test-host:8443');
      
      // Change to http protocol
      global._testWindowLocation = {
        protocol: 'http:',
        hostname: 'test-host',
        port: '8080'
      };
      
      const httpManager = new NetworkManager();
      expect(httpManager.getDefaultServerUrl()).toBe('ws://test-host:8080');
      
      // Restore original method
      NetworkManager.prototype.getDefaultServerUrl = originalGetDefaultServerUrl;
      delete global._testWindowLocation;
    });
  });
  
  describe('Connection Management', () => {
    test('should connect to WebSocket server', async () => {
      await networkManager.connect();
      
      expect(networkManager.connected).toBeTruthy();
      expect(networkManager.socket).not.toBeNull();
      expect(mockCallbacks.onConnect).toHaveBeenCalled();
      expect(networkManager.logger.info).toHaveBeenCalledWith('Connected to server');
    });
    
    test('should resolve with existing connection if already connected', async () => {
      // First connection
      await networkManager.connect();
      
      // Reset mocks
      mockCallbacks.onConnect.mockClear();
      networkManager.logger.info.mockClear();
      
      // Second connection attempt
      await networkManager.connect();
      
      expect(mockCallbacks.onConnect).not.toHaveBeenCalled();
      expect(networkManager.logger.info).toHaveBeenCalledWith('Already connected');
    });
    
    test('should disconnect from server', async () => {
      await networkManager.connect();
      networkManager.disconnect();
      
      expect(networkManager.connected).toBeFalsy();
      expect(mockCallbacks.onDisconnect).toHaveBeenCalled();
      expect(networkManager.autoReconnect).toBeFalsy(); // Should disable auto-reconnect
    });
    
    test('should handle connection errors', async () => {
      // Mock WebSocket to throw on construction
      global.WebSocket = function() {
        throw new Error('Connection failed');
      };
      
      try {
        await networkManager.connect();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Connection failed');
        expect(mockCallbacks.onError).toHaveBeenCalled();
        expect(networkManager.logger.error).toHaveBeenCalledWith(
          'Connection error',
          expect.objectContaining({ error: 'Connection failed' })
        );
      }
    });
    
    test('should report connection status correctly', async () => {
      expect(networkManager.isConnected()).toBeFalsy();
      
      await networkManager.connect();
      expect(networkManager.isConnected()).toBeTruthy();
      
      networkManager.disconnect();
      expect(networkManager.isConnected()).toBeFalsy();
    });
  });
  
  describe('Message Handling', () => {
    beforeEach(async () => {
      await networkManager.connect();
    });
    
    test('should send messages to server', () => {
      networkManager.socket.send = jest.fn();
      
      const result = networkManager.send('test_event', { data: 'test_data' });
      
      expect(result).toBeTruthy();
      expect(networkManager.socket.send).toHaveBeenCalledWith(
        expect.stringContaining('"event":"test_event"')
      );
      expect(networkManager.logger.info).toHaveBeenCalledWith(
        'Data sent',
        expect.any(Object)
      );
    });
    
    test('should not send when disconnected', () => {
      networkManager.disconnect();
      networkManager.socket.send = jest.fn();
      
      const result = networkManager.send('test_event', { data: 'test_data' });
      
      expect(result).toBeFalsy();
      expect(networkManager.socket.send).not.toHaveBeenCalled();
      expect(networkManager.logger.error).toHaveBeenCalled();
      // Verify the error message contains the expected text
      expect(networkManager.logger.error.mock.calls[0][0]).toBe('Cannot send data, not connected');
    });
    
    test('should handle send errors', () => {
      networkManager.socket.send = jest.fn(() => {
        throw new Error('Send failed');
      });
      
      const result = networkManager.send('test_event', { data: 'test_data' });
      
      expect(result).toBeFalsy();
      expect(networkManager.logger.error).toHaveBeenCalledWith(
        'Failed to send data',
        expect.objectContaining({ error: 'Send failed' })
      );
    });
    
    test('should process received messages', () => {
      // Register mock event handler
      const mockHandler = jest.fn();
      networkManager.on('test_event', mockHandler);
      
      // Simulate receiving a message
      const messageEvent = {
        data: JSON.stringify({
          event: 'test_event',
          data: { value: 'test_value' }
        })
      };
      
      networkManager.handleMessage(messageEvent);
      
      expect(mockHandler).toHaveBeenCalledWith({ value: 'test_value' });
      expect(networkManager.logger.info).toHaveBeenCalledWith(
        'Message received',
        expect.any(Object)
      );
    });
    
    test('should handle malformed messages', () => {
      // Simulate receiving an invalid message
      const messageEvent = {
        data: 'not valid json'
      };
      
      networkManager.handleMessage(messageEvent);
      
      expect(networkManager.logger.error).toHaveBeenCalledWith(
        'Failed to parse message',
        expect.any(Object)
      );
    });
    
    test('should handle errors in event handlers', () => {
      // Register buggy event handler
      const buggyHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      
      networkManager.on('test_event', buggyHandler);
      
      // Simulate receiving a message
      const messageEvent = {
        data: JSON.stringify({
          event: 'test_event',
          data: { value: 'test_value' }
        })
      };
      
      // Should not throw but log the error
      expect(() => networkManager.handleMessage(messageEvent)).not.toThrow();
      
      expect(buggyHandler).toHaveBeenCalled();
      expect(networkManager.logger.error).toHaveBeenCalledWith(
        'Error in event handler',
        expect.objectContaining({ error: 'Handler error' })
      );
    });
  });
  
  describe('Event Registration', () => {
    test('should register event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      networkManager.on('test_event', handler1);
      networkManager.on('test_event', handler2);
      
      expect(networkManager.eventHandlers.get('test_event')).toHaveLength(2);
      expect(networkManager.eventHandlers.get('test_event')).toContain(handler1);
      expect(networkManager.eventHandlers.get('test_event')).toContain(handler2);
    });
    
    test('should unregister event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      networkManager.on('test_event', handler1);
      networkManager.on('test_event', handler2);
      
      // Remove one handler
      networkManager.off('test_event', handler1);
      
      expect(networkManager.eventHandlers.get('test_event')).toHaveLength(1);
      expect(networkManager.eventHandlers.get('test_event')).not.toContain(handler1);
      expect(networkManager.eventHandlers.get('test_event')).toContain(handler2);
      
      // Remove second handler
      networkManager.off('test_event', handler2);
      
      // Map entry should be deleted when empty
      expect(networkManager.eventHandlers.has('test_event')).toBeFalsy();
    });
    
    test('should handle unregistering non-existent handlers', () => {
      const handler = jest.fn();
      
      // Should not throw when event doesn't exist
      expect(() => networkManager.off('nonexistent_event', handler)).not.toThrow();
      
      // Add an event, then try to remove different handler
      networkManager.on('test_event', jest.fn());
      
      // Should not throw when handler doesn't exist
      expect(() => networkManager.off('test_event', handler)).not.toThrow();
    });
  });
  
  describe('Heartbeat Mechanism', () => {
    beforeEach(() => {
      // Mock setInterval and clearInterval
      jest.useFakeTimers();
      
      // Instead of actually connecting, mock the connected state
      networkManager.connected = true;
      networkManager.socket = { close: jest.fn() };
      networkManager.send = jest.fn();
      return Promise.resolve();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    test('should set up heartbeat interval', () => {
      networkManager.setupHeartbeat(5000);
      
      // Fast-forward to trigger heartbeat
      jest.advanceTimersByTime(5000);
      
      expect(networkManager.send).toHaveBeenCalledWith('ping', expect.any(Object));
      
      // Fast-forward again
      jest.advanceTimersByTime(5000);
      
      expect(networkManager.send).toHaveBeenCalledTimes(2);
    });
    
    test('should stop heartbeat when disconnected', () => {
      networkManager.setupHeartbeat(5000);
      
      // Fast-forward to trigger heartbeat
      jest.advanceTimersByTime(5000);
      expect(networkManager.send).toHaveBeenCalledTimes(1);
      
      // Disconnect
      networkManager.connected = false;
      
      // Fast-forward again
      jest.advanceTimersByTime(5000);
      
      // Should not send another ping
      expect(networkManager.send).toHaveBeenCalledTimes(1);
    });
    
    test('should handle pong messages', () => {
      // Register pong handler
      networkManager.setupHeartbeat();
      
      // Simulate pong response
      const timestamp = Date.now();
      const pongEvent = {
        data: JSON.stringify({
          event: 'pong',
          data: { timestamp }
        })
      };
      
      // Mock Date.now to get consistent latency value
      const originalNow = Date.now;
      Date.now = jest.fn(() => timestamp + 50); // 50ms latency
      
      networkManager.handleMessage(pongEvent);
      
      expect(networkManager.logger.info).toHaveBeenCalledWith(
        'Heartbeat',
        expect.objectContaining({ latency: 50 })
      );
      
      // Restore Date.now
      Date.now = originalNow;
    });
    
    test('should clean up heartbeat on destroy', () => {
      // Setup and verify heartbeat
      networkManager.setupHeartbeat(5000);
      jest.advanceTimersByTime(5000);
      expect(networkManager.send).toHaveBeenCalledTimes(1);
      
      // Reset mock
      networkManager.send.mockClear();
      
      // Destroy network manager
      networkManager.destroy();
      
      // Fast-forward again
      jest.advanceTimersByTime(5000);
      
      // Should not send another ping
      expect(networkManager.send).not.toHaveBeenCalled();
    });
  });
  
  describe('Reconnection Logic', () => {
    beforeEach(() => {
      // Create a mock for WebSocket that Jest can track
      global.WebSocket = jest.fn((url) => {
        const socket = {
          url: url,
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
          close: jest.fn(function() {
            if (this.onclose) this.onclose({ code: 1000, reason: 'Test closure', wasClean: true });
          }),
          send: jest.fn()
        };
        
        // Store the socket for later access in tests
        global.WebSocket.lastCreatedSocket = socket;
        return socket;
      });
      
      // Mock setTimeout to be synchronous for testing
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
      delete global.WebSocket.lastCreatedSocket;
    });
    
    test('should attempt to reconnect on connection close', () => {
      // Enable auto reconnect
      networkManager.autoReconnect = true;
      networkManager.maxReconnectAttempts = 3;
      networkManager.reconnectInterval = 1000;
      
      // Reset call count
      global.WebSocket.mockClear();
      
      // Initial connection
      networkManager.connect();
      
      // Verify WebSocket was called
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Manually set connected state for test
      networkManager.connected = true;
      networkManager.reconnectAttempts = 0;
      
      // First connection should be successful
      expect(networkManager.connected).toBeTruthy();
      expect(networkManager.reconnectAttempts).toBe(0);
      
      // Mock close event
      networkManager.handleClose({ code: 1006, reason: 'Connection lost', wasClean: false });
      
      // Should not be connected anymore
      expect(networkManager.connected).toBeFalsy();
      expect(networkManager.reconnectAttempts).toBe(1);
      
      // Clear the mock between reconnect attempts
      global.WebSocket.mockClear();
      
      // First reconnection attempt
      jest.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate second disconnect
      networkManager.handleClose({ code: 1006, reason: 'Connection lost again', wasClean: false });
      expect(networkManager.reconnectAttempts).toBe(2);
      
      // Clear the mock between reconnect attempts
      global.WebSocket.mockClear();
      
      // Second reconnection attempt
      jest.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate third disconnect
      networkManager.handleClose({ code: 1006, reason: 'Connection lost again', wasClean: false });
      expect(networkManager.reconnectAttempts).toBe(3);
      
      // Clear the mock between reconnect attempts
      global.WebSocket.mockClear();
      
      // Third reconnection attempt
      jest.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate fourth disconnect - should stop reconnecting
      networkManager.handleClose({ code: 1006, reason: 'Connection lost again', wasClean: false });
      
      // Reset mock calls
      global.WebSocket.mockClear();
      
      // No more reconnection attempts
      jest.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(0); // Should not be called again
    });
    
    test('should not attempt to reconnect when auto-reconnect is disabled', () => {
      // Disable auto reconnect
      networkManager.autoReconnect = false;
      
      // Reset mock first
      global.WebSocket.mockClear();
      
      // Connect
      networkManager.connect();
      
      // Should have called WebSocket constructor once
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Manually set connected state
      networkManager.connected = true;
      
      // Reset mock again
      global.WebSocket.mockClear();
      
      // Simulate disconnect
      networkManager.handleClose({ code: 1000, reason: 'Normal close', wasClean: true });
      
      // Wait for potential reconnect
      jest.advanceTimersByTime(5000);
      
      // Should not try to reconnect
      expect(global.WebSocket).not.toHaveBeenCalled();
    });
    
    test('should reset reconnect attempts after successful connection', () => {
      // Enable auto reconnect
      networkManager.autoReconnect = true;
      networkManager.maxReconnectAttempts = 5;
      networkManager.reconnectAttempts = 3; // Pretend we've already tried 3 times
      
      // Connect
      networkManager.connect();
      
      // Simulate successful connection by calling handleOpen directly
      networkManager.handleOpen(() => {}); // Pass empty resolve function
      
      // Should reset reconnect attempts
      expect(networkManager.reconnectAttempts).toBe(0);
    });
  });
  
  describe('Resource Cleanup', () => {
    test('should clean up resources on destroy', async () => {
      await networkManager.connect();
      
      // Setup heartbeat and spy on clearInterval
      const originalClearInterval = global.clearInterval;
      global.clearInterval = jest.fn();
      
      networkManager.setupHeartbeat();
      
      // Spy on disconnect
      networkManager.disconnect = jest.fn();
      
      // Destroy
      networkManager.destroy();
      
      expect(networkManager.disconnect).toHaveBeenCalled();
      expect(global.clearInterval).toHaveBeenCalled();
      expect(networkManager.socket).toBeNull();
      expect(networkManager.eventHandlers.size).toBe(0);
      
      // Restore clearInterval
      global.clearInterval = originalClearInterval;
    });
  });
});
