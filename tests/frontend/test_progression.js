/**
 * Test suite for the ProgressionManager component
 */

import { ProgressionManager } from '../../client/progression.js';

describe('ProgressionManager', () => {
  let progressionManager;
  let mockAudioManager;
  let mockSocket;
  let mockDOMElements;
  
  // Set up mocks and DOM elements
  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="progress-panel" class="panel"></div>
      <div id="progress-content"></div>
      <div id="challenges-panel" class="panel"></div>
      <div id="challenges-content"></div>
      <div id="achievements" class="achievements-panel"></div>
      <button id="progress-button"></button>
      <button id="challenges-button"></button>
      <button id="close-progress"></button>
      <button id="close-challenges"></button>
    `;
    
    // Cache mock DOM elements
    mockDOMElements = {
      progressPanel: document.getElementById('progress-panel'),
      progressContent: document.getElementById('progress-content'),
      challengesPanel: document.getElementById('challenges-panel'),
      challengesContent: document.getElementById('challenges-content'),
      achievementsPanel: document.getElementById('achievements'),
      progressButton: document.getElementById('progress-button'),
      challengesButton: document.getElementById('challenges-button'),
      closeProgressButton: document.getElementById('close-progress'),
      closeChallengesButton: document.getElementById('close-challenges')
    };
    
    // Mock audio manager
    mockAudioManager = {
      playSound: jest.fn()
    };
    
    // Mock socket
    mockSocket = {
      emit: jest.fn()
    };
    
    // Create ProgressionManager instance
    progressionManager = new ProgressionManager(mockAudioManager);
    
    // Mock setTimeout
    jest.useFakeTimers();
  });
  
  // Restore after tests
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });
  
  test('should initialize with event listeners', () => {
    // Verify click event listeners
    const progressButtonSpy = jest.spyOn(mockDOMElements.progressButton, 'addEventListener');
    const challengesButtonSpy = jest.spyOn(mockDOMElements.challengesButton, 'addEventListener');
    const closeProgressSpy = jest.spyOn(mockDOMElements.closeProgressButton, 'addEventListener');
    const closeChallengesSpy = jest.spyOn(mockDOMElements.closeChallengesButton, 'addEventListener');
    
    // Re-initialize to trigger event listeners
    progressionManager = new ProgressionManager(mockAudioManager);
    
    // Verify that event listeners were added
    expect(progressButtonSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(challengesButtonSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(closeProgressSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(closeChallengesSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });
  
  test('should update progress UI correctly', () => {
    // Sample progress data
    const progressData = {
      level: 5,
      experience: 1500,
      next_level_xp: 2000,
      total_stars: 75,
      special_stars: 10,
      achievements: [
        {
          id: 'first_star',
          title: 'First Star',
          description: 'Collected your first star',
          icon: '⭐',
          unlocked: true,
          date: '2023-05-15T10:30:00Z'
        },
        {
          id: 'level_5',
          title: 'High Flyer',
          description: 'Reached level 5',
          icon: '🚀',
          unlocked: true,
          date: '2023-05-16T14:22:00Z'
        }
      ]
    };
    
    // Update progress
    progressionManager.updateProgress(progressData);
    
    // Show progress panel
    progressionManager.showProgressPanel();
    
    // Verify panel is shown
    expect(mockDOMElements.progressPanel.classList.contains('show')).toBe(true);
    
    // Verify content contains correct information
    expect(mockDOMElements.progressContent.innerHTML).toContain('Level 5');
    expect(mockDOMElements.progressContent.innerHTML).toContain('1500');
    expect(mockDOMElements.progressContent.innerHTML).toContain('2000');
    expect(mockDOMElements.progressContent.innerHTML).toContain('75');
    expect(mockDOMElements.progressContent.innerHTML).toContain('10');
    expect(mockDOMElements.progressContent.innerHTML).toContain('First Star');
    expect(mockDOMElements.progressContent.innerHTML).toContain('High Flyer');
    
    // Verify audio is played
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_open');
  });
  
  test('should update challenges UI correctly', () => {
    // Sample challenges data
    const challengesData = {
      daily_challenges: [
        {
          id: 'challenge1',
          title: 'Star Collector',
          description: 'Collect 20 stars',
          progress: 15,
          goal: 20,
          reward: 100,
          completed: false,
          expires_in: '5 hours'
        },
        {
          id: 'challenge2',
          title: 'Speed Demon',
          description: 'Fly through 5 rings in under 10 seconds',
          progress: 5,
          goal: 5,
          reward: 200,
          completed: true,
          expires_in: '5 hours'
        }
      ]
    };
    
    // Update challenges
    progressionManager.updateChallenges(challengesData);
    
    // Show challenges panel
    progressionManager.showChallengesPanel();
    
    // Verify panel is shown
    expect(mockDOMElements.challengesPanel.classList.contains('show')).toBe(true);
    
    // Verify content contains correct information
    expect(mockDOMElements.challengesContent.innerHTML).toContain('Star Collector');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('15/20');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('100');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('Speed Demon');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('5/5');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('200');
    expect(mockDOMElements.challengesContent.innerHTML).toContain('5 hours');
    
    // Verify challenge complete class is applied
    const challengeItems = mockDOMElements.challengesContent.querySelectorAll('.challenge-item');
    expect(challengeItems[1].classList.contains('challenge-complete')).toBe(true);
    
    // Verify audio is played
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_open');
  });
  
  test('should display achievement notification', () => {
    // Sample achievement data
    const achievementData = {
      id: 'speed_star',
      title: 'Speed Star',
      description: 'Collected 3 stars within 5 seconds',
      icon: '⚡',
      points: 15
    };
    
    // Show achievement
    progressionManager.showAchievement(achievementData);
    
    // Verify achievement is shown
    const achievementElement = mockDOMElements.achievementsPanel.querySelector('.achievement-notification');
    expect(achievementElement).not.toBeNull();
    expect(achievementElement.textContent).toContain('Speed Star');
    expect(achievementElement.textContent).toContain('15');
    
    // Verify audio is played
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('achievement');
    
    // Fast-forward timers to test auto-removal
    jest.advanceTimersByTime(5000);
    
    // Verify achievement is removed after timeout
    expect(mockDOMElements.achievementsPanel.querySelector('.achievement-notification')).toBeNull();
  });
  
  test('should request progression updates from server', () => {
    // Request updates
    progressionManager.requestProgressUpdate(mockSocket);
    progressionManager.requestChallengesUpdate(mockSocket);
    
    // Verify socket emits were called with correct events
    expect(mockSocket.emit).toHaveBeenCalledWith('get_progress');
    expect(mockSocket.emit).toHaveBeenCalledWith('get_challenges');
  });
  
  test('should close panels correctly', () => {
    // Show panels first
    mockDOMElements.progressPanel.classList.add('show');
    mockDOMElements.challengesPanel.classList.add('show');
    
    // Close panels
    progressionManager.closeProgressPanel();
    progressionManager.closeChallengesPanel();
    
    // Verify panels are hidden
    expect(mockDOMElements.progressPanel.classList.contains('show')).toBe(false);
    expect(mockDOMElements.challengesPanel.classList.contains('show')).toBe(false);
    
    // Verify audio is played
    expect(mockAudioManager.playSound).toHaveBeenCalledWith('ui_close');
    expect(mockAudioManager.playSound).toHaveBeenCalledTimes(2);
  });
});
