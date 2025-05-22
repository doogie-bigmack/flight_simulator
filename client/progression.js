/**
 * Progression system UI and data handling
 * Handles player progression, achievements, and challenges
 */
export class ProgressionManager {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.userProgress = null;
    this.challenges = [];
    this.achievementsPanel = document.getElementById('achievements');
    this.progressPanel = document.getElementById('progress-panel');
    this.challengesPanel = document.getElementById('challenges-panel');
    this.challengesButton = document.getElementById('challenges-button');
    this.progressButton = document.getElementById('progress-button');
    
    // Initialize JSON logger
    this.logger = {
      info: (message, data = {}) => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'ProgressionManager',
          message,
          ...data
        }));
      },
      error: (message, data = {}) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          component: 'ProgressionManager',
          message,
          ...data
        }));
      }
    };
    
    this.setupEventListeners();
  }
  
  /**
   * Set up UI event listeners
   */
  setupEventListeners() {
    // Close buttons for panels
    document.getElementById('close-progress').addEventListener('click', () => {
      this.progressPanel.classList.remove('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
    
    document.getElementById('close-challenges').addEventListener('click', () => {
      this.challengesPanel.classList.remove('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
    
    // Open buttons for panels
    this.progressButton.addEventListener('click', () => {
      this.progressPanel.classList.add('show');
      this.challengesPanel.classList.remove('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
    
    this.challengesButton.addEventListener('click', () => {
      this.challengesPanel.classList.add('show');
      this.progressPanel.classList.remove('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
  }
  
  /**
   * Update user progress data
   * @param {Object} progressData - Progress data from server
   */
  updateProgress(progressData) {
    this.userProgress = progressData;
    this.renderProgressPanel();
    this.logger.info('Progress updated', { progressData });
  }
  
  /**
   * Update challenges data
   * @param {Array} challengesData - Challenges data from server
   */
  updateChallenges(challengesData) {
    this.challenges = challengesData;
    this.renderChallengesPanel();
    this.logger.info('Challenges updated', { challengesCount: challengesData.length });
  }
  
  /**
   * Show achievement notification
   * @param {Object} achievement - Achievement data
   */
  showAchievement(achievement) {
    // Create achievement element
    const achievementEl = document.createElement('div');
    achievementEl.className = 'achievement';
    
    // Create content
    achievementEl.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-text">
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
    
    // Add to achievements panel
    this.achievementsPanel.appendChild(achievementEl);
    
    // Play achievement sound
    if (this.audioManager) {
      this.audioManager.playSound('achievement');
    }
    
    // Remove after animation
    setTimeout(() => {
      achievementEl.remove();
    }, 5000);
    
    // Update progress panel if open
    if (this.progressPanel.classList.contains('show')) {
      this.renderProgressPanel();
    }
    
    this.logger.info('Achievement displayed', { achievement });
  }
  
  /**
   * Render progress panel with current data
   */
  renderProgressPanel() {
    if (!this.userProgress) return;
    
    const progressContent = document.getElementById('progress-content');
    const { level, experience, next_level_xp, progress_percentage, 
            login_streak, total_stars, special_stars, 
            unlocked_achievements, achievement_percentage } = this.userProgress;
            
    // Create content
    let html = `
      <div class="progress-header">
        <h3>Level ${level}</h3>
        <div class="level-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress_percentage}%"></div>
          </div>
          <div class="progress-text">${experience} / ${next_level_xp} XP</div>
        </div>
      </div>
      
      <div class="progress-stats">
        <div class="stat-item">
          <div class="stat-value">${total_stars}</div>
          <div class="stat-label">Stars Collected</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${special_stars}</div>
          <div class="stat-label">Special Stars</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${login_streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>
      
      <h4>Achievements (${unlocked_achievements.length})</h4>
      <div class="achievements-grid">
    `;
    
    // Add achievements
    if (unlocked_achievements.length > 0) {
      unlocked_achievements.forEach(achievement => {
        html += `
          <div class="achievement-item">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
              <div class="achievement-title">${achievement.title}</div>
              <div class="achievement-desc">${achievement.description}</div>
            </div>
          </div>
        `;
      });
    } else {
      html += '<div class="empty-message">Complete goals to earn achievements!</div>';
    }
    
    html += `
      </div>
      <div class="achievement-progress">
        <div class="progress-text">Achievement Completion: ${achievement_percentage}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${achievement_percentage}%"></div>
        </div>
      </div>
    `;
    
    progressContent.innerHTML = html;
  }
  
  /**
   * Render challenges panel with current data
   */
  renderChallengesPanel() {
    const challengesContent = document.getElementById('challenges-content');
    
    if (!this.challenges || this.challenges.length === 0) {
      challengesContent.innerHTML = '<div class="empty-message">No active challenges</div>';
      return;
    }
    
    let html = '<div class="challenges-list">';
    
    this.challenges.forEach(challenge => {
      const progress = challenge.progress || 0;
      const goal = challenge.goal;
      const percentage = Math.min(100, Math.floor((progress / goal) * 100));
      const isComplete = percentage >= 100;
      const statusClass = isComplete ? 'challenge-complete' : 'challenge-active';
      const timeRemaining = challenge.remaining_hours ? 
        `${Math.floor(challenge.remaining_hours)}h ${Math.floor((challenge.remaining_hours % 1) * 60)}m` : 
        'Expires soon';
      
      html += `
        <div class="challenge-item ${statusClass}">
          <div class="challenge-status">${isComplete ? '✓' : '⏳'}</div>
          <div class="challenge-info">
            <div class="challenge-title">${challenge.title}</div>
            <div class="challenge-desc">${challenge.description}</div>
            <div class="challenge-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="progress-text">${progress} / ${goal}</div>
            </div>
          </div>
          <div class="challenge-reward">
            <div class="reward-value">+${challenge.reward} XP</div>
            <div class="time-remaining">${timeRemaining}</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    challengesContent.innerHTML = html;
  }
  
  /**
   * Request progress data update from server
   * @param {Socket} socket - Socket.io connection
   */
  requestProgressUpdate(socket) {
    if (socket) {
      socket.emit('get_progress', { type: 'get_progress' });
      this.logger.info('Requested progress update');
    }
  }
  
  /**
   * Request challenges data update from server
   * @param {Socket} socket - Socket.io connection
   */
  requestChallengesUpdate(socket) {
    if (socket) {
      socket.emit('get_challenges', { type: 'get_challenges' });
      this.logger.info('Requested challenges update');
    }
  }
}
