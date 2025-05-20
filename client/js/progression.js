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
      this.challengesPanel.classList.remove('show');
      this.progressPanel.classList.add('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
    
    this.challengesButton.addEventListener('click', () => {
      this.progressPanel.classList.remove('show');
      this.challengesPanel.classList.add('show');
      if (this.audioManager) this.audioManager.playSound('ui_click');
    });
    
    // Check progress button
    document.getElementById('progress-button').addEventListener('mouseenter', () => {
      if (this.audioManager) this.audioManager.playSound('ui_hover');
    });
    
    // Check challenges button
    document.getElementById('challenges-button').addEventListener('mouseenter', () => {
      if (this.audioManager) this.audioManager.playSound('ui_hover');
    });
  }
  
  /**
   * Update user progress with server data
   * @param {Object} progressData - Progress data from server
   */
  updateProgress(progressData) {
    this.userProgress = progressData;
    this.updateProgressUI();
    this.logger.info('Progress updated', { progress: progressData });
  }
  
  /**
   * Update challenges with server data
   * @param {Array} challengesData - Challenges data from server
   */
  updateChallenges(challengesData) {
    this.challenges = challengesData || [];
    this.updateChallengesUI();
    this.logger.info('Challenges updated', { 
      count: this.challenges.length 
    });
  }
  
  /**
   * Update the progress UI elements
   */
  updateProgressUI() {
    if (!this.userProgress) return;
    
    const progressContent = document.getElementById('progress-content');
    
    // Basic player stats
    const stats = document.createElement('div');
    stats.className = 'progress-stats';
    stats.innerHTML = `
      <h3>Player Stats</h3>
      <div class="stat-item">
        <span>Level:</span> ${this.userProgress.level}
      </div>
      <div class="stat-item">
        <span>XP:</span> ${this.userProgress.experience} / ${this.userProgress.next_level_xp}
      </div>
      <div class="stat-item">
        <span>Stars Collected:</span> ${this.userProgress.stars_collected}
      </div>
      <div class="stat-item">
        <span>Play Time:</span> ${this.formatPlayTime(this.userProgress.play_time)}
      </div>
      <div class="stat-item">
        <span>Login Streak:</span> ${this.userProgress.login_streak} days
      </div>
    `;
    
    // XP progress bar
    const xpRequired = this.userProgress.next_level_xp - this.userProgress.level_xp_start;
    const xpProgress = this.userProgress.experience - this.userProgress.level_xp_start;
    const xpPercent = Math.min(100, Math.max(0, (xpProgress / xpRequired) * 100));
    
    const progressBar = document.createElement('div');
    progressBar.className = 'xp-progress';
    progressBar.innerHTML = `
      <div class="progress-label">XP Progress</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${xpPercent}%"></div>
      </div>
      <div class="progress-text">${xpProgress} / ${xpRequired} XP</div>
    `;
    
    // Recent achievements
    const achievements = document.createElement('div');
    achievements.className = 'recent-achievements';
    achievements.innerHTML = '<h3>Recent Achievements</h3>';
    
    if (this.userProgress.recent_achievements && this.userProgress.recent_achievements.length > 0) {
      const achievementsList = document.createElement('ul');
      this.userProgress.recent_achievements.forEach(achievement => {
        const item = document.createElement('li');
        item.className = 'achievement-item';
        item.innerHTML = `
          <div class="achievement-icon ${achievement.rarity || 'common'}">🏆</div>
          <div class="achievement-details">
            <div class="achievement-title">${achievement.title}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-date">Unlocked: ${new Date(achievement.unlocked_at).toLocaleDateString()}</div>
          </div>
        `;
        achievementsList.appendChild(item);
      });
      achievements.appendChild(achievementsList);
    } else {
      achievements.innerHTML += '<p>No achievements yet. Keep playing to earn some!</p>';
    }
    
    // Clear and append
    progressContent.innerHTML = '';
    progressContent.appendChild(stats);
    progressContent.appendChild(progressBar);
    progressContent.appendChild(achievements);
  }
  
  /**
   * Update the challenges UI elements
   */
  updateChallengesUI() {
    const challengesContent = document.getElementById('challenges-content');
    
    if (!this.challenges || this.challenges.length === 0) {
      challengesContent.innerHTML = '<p>No active challenges. Check back later!</p>';
      return;
    }
    
    // Group challenges by type
    const dailyChallenges = this.challenges.filter(c => c.type === 'daily');
    const weeklyChallenges = this.challenges.filter(c => c.type === 'weekly');
    const specialChallenges = this.challenges.filter(c => c.type === 'special');
    
    // Clear container
    challengesContent.innerHTML = '';
    
    // Daily challenges section
    if (dailyChallenges.length > 0) {
      this.addChallengeSection(challengesContent, 'Daily Challenges', dailyChallenges);
    }
    
    // Weekly challenges section
    if (weeklyChallenges.length > 0) {
      this.addChallengeSection(challengesContent, 'Weekly Challenges', weeklyChallenges);
    }
    
    // Special challenges section
    if (specialChallenges.length > 0) {
      this.addChallengeSection(challengesContent, 'Special Challenges', specialChallenges);
    }
  }
  
  /**
   * Add a challenge section to the container
   * @param {HTMLElement} container - Container element
   * @param {string} title - Section title
   * @param {Array} challenges - Challenges for this section
   */
  addChallengeSection(container, title, challenges) {
    const section = document.createElement('div');
    section.className = 'challenge-section';
    
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
    
    challenges.forEach(challenge => {
      const challengeItem = document.createElement('div');
      challengeItem.className = `challenge-item ${challenge.completed ? 'completed' : ''}`;
      
      // Calculate progress percentage
      const progressPercent = challenge.total > 0 
        ? Math.min(100, Math.max(0, (challenge.progress / challenge.total) * 100))
        : 0;
      
      // Challenge content
      challengeItem.innerHTML = `
        <div class="challenge-header">
          <div class="challenge-title">${challenge.title}</div>
          <div class="challenge-reward">${challenge.reward_xp} XP</div>
        </div>
        <div class="challenge-description">${challenge.description}</div>
        <div class="challenge-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-text">${challenge.progress} / ${challenge.total}</div>
        </div>
        ${challenge.expires_at ? `
          <div class="challenge-expires">
            Expires in: ${this.getTimeRemaining(challenge.expires_at)}
          </div>
        ` : ''}
      `;
      
      section.appendChild(challengeItem);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Show an achievement notification
   * @param {Object} achievementData - Achievement data
   */
  showAchievement(achievementData) {
    if (!achievementData) return;
    
    // Play achievement sound
    if (this.audioManager) {
      this.audioManager.playSound('achievement');
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `achievement-notification ${achievementData.rarity || 'common'}`;
    notification.innerHTML = `
      <div class="achievement-icon">🏆</div>
      <div class="achievement-info">
        <div class="achievement-header">Achievement Unlocked!</div>
        <div class="achievement-title">${achievementData.title}</div>
        <div class="achievement-description">${achievementData.description}</div>
      </div>
    `;
    
    // Add to DOM
    this.achievementsPanel.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
      
      // Remove after display
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 500);
      }, 5000);
    }, 10);
    
    this.logger.info('Achievement unlocked', { achievement: achievementData });
  }
  
  /**
   * Request progress update from server
   * @param {WebSocket} socket - WebSocket connection
   */
  requestProgressUpdate(socket) {
    if (!socket) return;
    
    socket.emit('get_progress', {});
    this.logger.info('Progress update requested');
  }
  
  /**
   * Request challenges update from server
   * @param {WebSocket} socket - WebSocket connection
   */
  requestChallengesUpdate(socket) {
    if (!socket) return;
    
    socket.emit('get_challenges', {});
    this.logger.info('Challenges update requested');
  }
  
  /**
   * Format play time into human-readable string
   * @param {number} seconds - Play time in seconds
   * @returns {string} Formatted play time
   */
  formatPlayTime(seconds) {
    if (!seconds || seconds < 0) return '0 minutes';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
  }
  
  /**
   * Get time remaining until expiration
   * @param {string} expiryDate - ISO date string for expiration time
   * @returns {string} Formatted time remaining
   */
  getTimeRemaining(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }
  }
}
