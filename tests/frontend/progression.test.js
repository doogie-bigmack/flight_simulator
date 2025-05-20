/**
 * Tests for the Progression Manager
 */
import { ProgressionManager } from '../../client/js/progression.js';

describe('ProgressionManager', () => {
  let progressionManager;
  let mockAudioManager;
  let mockDOMElements;
  
  // Helper to create mock DOM elements
  function setupMockDOM() {
    // Mock DOM elements
    mockDOMElements = {
      'achievements': document.createElement('div'),
      'progress-panel': document.createElement('div'),
      'challenges-panel': document.createElement('div'),
      'challenges-button': document.createElement('div'),
      'progress-button': document.createElement('div'),
      'close-progress': document.createElement('button'),
      'close-challenges': document.createElement('button'),
      'progress-content': document.createElement('div'),
      'challenges-content': document.createElement('div')
    };
    
    // Add all elements to document
    Object.entries(mockDOMElements).forEach(([id, element]) => {
      element.id = id;
      document.body.appendChild(element);
    });
  }
  
  beforeEach(() => {
    // Set up DOM elements
    setupMockDOM();
    
    // Mock audio manager
    mockAudioManager = {
      playSound: jest.fn()
    };
    
    // Create new progression manager
    progressionManager = new ProgressionManager(mockAudioManager);
    
    // Mock logger to avoid console noise during tests
    progressionManager.logger = {
      info: jest.fn(),
      error: jest.fn()
    };
  });
  
  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    jest.resetAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(progressionManager.userProgress).toBeNull();
      expect(progressionManager.challenges).toEqual([]);
      expect(progressionManager.audioManager).toBe(mockAudioManager);
    });
    
    test('should set up DOM references', () => {
      expect(progressionManager.achievementsPanel).toBeDefined();
      expect(progressionManager.progressPanel).toBeDefined();
      expect(progressionManager.challengesPanel).toBeDefined();
      expect(progressionManager.challengesButton).toBeDefined();
      expect(progressionManager.progressButton).toBeDefined();
    });
    
    test('should set up event listeners', () => {
      const closeProgressBtn = document.getElementById('close-progress');
      const closeChallengesBtn = document.getElementById('close-challenges');
      const progressBtn = document.getElementById('progress-button');
      const challengesBtn = document.getElementById('challenges-button');
      
      // Trigger click events
      closeProgressBtn.click();
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_click');
      
      closeChallengesBtn.click();
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_click');
      
      // Test mouseenter events
      const mouseEnterEvent = new Event('mouseenter');
      progressBtn.dispatchEvent(mouseEnterEvent);
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_hover');
      
      challengesBtn.dispatchEvent(mouseEnterEvent);
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_hover');
    });
  });
  
  describe('Progress Updates', () => {
    test('should update user progress', () => {
      const mockProgress = {
        level: 5,
        experience: 1250,
        next_level_xp: 2000,
        level_xp_start: 1000,
        stars_collected: 42,
        play_time: 3600,
        login_streak: 3,
        recent_achievements: []
      };
      
      progressionManager.updateProgress(mockProgress);
      
      expect(progressionManager.userProgress).toEqual(mockProgress);
      expect(progressionManager.logger.info).toHaveBeenCalledWith(
        'Progress updated', 
        expect.objectContaining({ progress: mockProgress })
      );
    });
    
    test('should update progress UI when progress is updated', () => {
      // Mock implementation of updateProgressUI
      progressionManager.updateProgressUI = jest.fn();
      
      const mockProgress = { level: 3, experience: 500 };
      progressionManager.updateProgress(mockProgress);
      
      expect(progressionManager.updateProgressUI).toHaveBeenCalled();
    });
    
    test('should format play time correctly', () => {
      // Just minutes
      expect(progressionManager.formatPlayTime(300)).toBe('5 minutes');
      
      // Hours and minutes
      expect(progressionManager.formatPlayTime(3665)).toBe('1 hour, 1 minute');
      
      // Multiple hours and minutes
      expect(progressionManager.formatPlayTime(7890)).toBe('2 hours, 11 minutes');
      
      // Handle edge cases
      expect(progressionManager.formatPlayTime(0)).toBe('0 minutes');
      expect(progressionManager.formatPlayTime(-10)).toBe('0 minutes');
      expect(progressionManager.formatPlayTime(null)).toBe('0 minutes');
    });
  });
  
  describe('Challenge Updates', () => {
    test('should update challenges', () => {
      const mockChallenges = [
        { id: 1, title: 'Test Challenge', type: 'daily' },
        { id: 2, title: 'Weekly Challenge', type: 'weekly' }
      ];
      
      progressionManager.updateChallenges(mockChallenges);
      
      expect(progressionManager.challenges).toEqual(mockChallenges);
      expect(progressionManager.logger.info).toHaveBeenCalledWith(
        'Challenges updated', 
        expect.objectContaining({ count: 2 })
      );
    });
    
    test('should handle null challenges data', () => {
      progressionManager.updateChallenges(null);
      
      expect(progressionManager.challenges).toEqual([]);
    });
    
    test('should update challenges UI when challenges are updated', () => {
      // Mock implementation of updateChallengesUI
      progressionManager.updateChallengesUI = jest.fn();
      
      const mockChallenges = [{ id: 1, title: 'Test Challenge' }];
      progressionManager.updateChallenges(mockChallenges);
      
      expect(progressionManager.updateChallengesUI).toHaveBeenCalled();
    });
    
    test('should calculate time remaining correctly', () => {
      // Save original Date
      const OriginalDate = global.Date;
      
      // Mock the Date object for stable testing
      const mockCurrentTime = new Date('2023-01-01T12:00:00Z');
      
      // Mock Date constructor
      global.Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            // When called with no args, return our fixed mock date
            return mockCurrentTime;
          }
          return new OriginalDate(...args);
        }
        
        // Mock now() method
        static now() {
          return mockCurrentTime.getTime();
        }
      };
      
      try {
        // 2 hours from now
        const twoHoursLater = new Date('2023-01-01T14:00:00Z');
        expect(progressionManager.getTimeRemaining(twoHoursLater.toISOString())).toBe('2 hours');
        
        // 1 day from now
        const oneDayLater = new Date('2023-01-02T12:00:00Z');
        expect(progressionManager.getTimeRemaining(oneDayLater.toISOString())).toBe('1 day');
        
        // 3 days from now
        const threeDaysLater = new Date('2023-01-04T12:00:00Z');
        expect(progressionManager.getTimeRemaining(threeDaysLater.toISOString())).toBe('3 days');
        
        // Already expired
        const expired = new Date('2023-01-01T11:00:00Z');
        expect(progressionManager.getTimeRemaining(expired.toISOString())).toBe('Expired');
      } finally {
        // Restore the original Date
        global.Date = OriginalDate;
      }
    });
  });
  
  describe('Achievement Notifications', () => {
    test('should show achievement notification', () => {
      const mockAchievement = {
        id: 'achievement1',
        title: 'First Flight',
        description: 'Complete your first flight',
        rarity: 'common'
      };
      
      // Replace appendChild with a jest function
      const originalAppendChild = progressionManager.achievementsPanel.appendChild;
      progressionManager.achievementsPanel.appendChild = jest.fn(originalAppendChild);
      
      progressionManager.showAchievement(mockAchievement);
      
      // Check if audio was played
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('achievement');
      
      // Check if notification was added to DOM
      expect(progressionManager.achievementsPanel.appendChild).toHaveBeenCalled();
      
      // Check if logged
      expect(progressionManager.logger.info).toHaveBeenCalledWith(
        'Achievement unlocked',
        expect.objectContaining({ achievement: mockAchievement })
      );
    });
    
    test('should not crash when achievement data is null', () => {
      progressionManager.showAchievement(null);
      expect(mockAudioManager.playSound).not.toHaveBeenCalled();
    });
  });
  
  describe('Server Communication', () => {
    test('should request progress update from server', () => {
      const mockSocket = {
        emit: jest.fn()
      };
      
      progressionManager.requestProgressUpdate(mockSocket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('get_progress', {});
      expect(progressionManager.logger.info).toHaveBeenCalledWith('Progress update requested');
    });
    
    test('should request challenges update from server', () => {
      const mockSocket = {
        emit: jest.fn()
      };
      
      progressionManager.requestChallengesUpdate(mockSocket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('get_challenges', {});
      expect(progressionManager.logger.info).toHaveBeenCalledWith('Challenges update requested');
    });
    
    test('should not crash when socket is null', () => {
      expect(() => {
        progressionManager.requestProgressUpdate(null);
        progressionManager.requestChallengesUpdate(null);
      }).not.toThrow();
    });
  });
  
  describe('UI Updates', () => {
    test('should not crash when updating progress UI without progress data', () => {
      progressionManager.userProgress = null;
      expect(() => {
        progressionManager.updateProgressUI();
      }).not.toThrow();
    });
    
    test('should handle empty challenges when updating challenges UI', () => {
      const challengesContent = document.getElementById('challenges-content');
      
      progressionManager.challenges = [];
      progressionManager.updateChallengesUI();
      
      expect(challengesContent.innerHTML).toContain('No active challenges');
    });
    
    test('should add challenge section to container', () => {
      const container = document.createElement('div');
      const title = 'Test Section';
      const challenges = [
        {
          title: 'Test Challenge',
          description: 'Test description',
          reward_xp: 100,
          progress: 5,
          total: 10,
          completed: false
        }
      ];
      
      progressionManager.addChallengeSection(container, title, challenges);
      
      // Check if section was added
      expect(container.innerHTML).toContain('Test Section');
      expect(container.innerHTML).toContain('Test Challenge');
      expect(container.innerHTML).toContain('100 XP');
      expect(container.innerHTML).toContain('5 / 10');
    });
  });
});
