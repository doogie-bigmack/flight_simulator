"""
Progression system for Sky Squad flight simulator
Handles player experience, levels, achievements and challenges
"""
import json
import logging
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union

class Achievement:
    """Achievement definition class"""
    def __init__(self, 
                 id: str, 
                 title: str, 
                 description: str, 
                 icon: str = "🌟",
                 points: int = 10,
                 hidden: bool = False):
        self.id = id
        self.title = title
        self.description = description
        self.icon = icon
        self.points = points
        self.hidden = hidden
    
    def to_dict(self) -> dict:
        """Convert achievement to dictionary for serialization"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "points": self.points,
            "hidden": self.hidden
        }


class Challenge:
    """Daily/weekly challenge definition"""
    def __init__(self,
                id: str,
                title: str,
                description: str,
                goal: int,
                reward: int,
                category: str,
                duration_hours: int = 24):
        self.id = id
        self.title = title
        self.description = description
        self.goal = goal
        self.reward = reward
        self.category = category
        self.duration_hours = duration_hours
        self.start_time = datetime.now()
        self.end_time = self.start_time + timedelta(hours=duration_hours)
    
    def is_expired(self) -> bool:
        """Check if challenge has expired"""
        return datetime.now() > self.end_time
    
    def to_dict(self) -> dict:
        """Convert challenge to dictionary for serialization"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "goal": self.goal,
            "reward": self.reward,
            "category": self.category,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "remaining_hours": max(0, (self.end_time - datetime.now()).total_seconds() / 3600)
        }


class PlayerProgression:
    """Manages player progression, experience, levels and achievements"""
    
    # Experience points required per level (exponential growth)
    LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1000, 1750, 2200, 2700, 3250]
    
    # Predefined achievements
    ACHIEVEMENTS = [
        Achievement("first_star", "First Star", "Collect your first star", "⭐", 5),
        Achievement("collector_10", "Star Collector", "Collect 10 stars", "🌠", 10),
        Achievement("collector_50", "Star Master", "Collect 50 stars", "✨", 20),
        Achievement("collector_100", "Star Champion", "Collect 100 stars", "🌌", 30),
        Achievement("special_5", "Special Star Hunter", "Collect 5 special stars", "🌟", 15),
        Achievement("special_20", "Special Star Expert", "Collect 20 special stars", "🔆", 30),
        Achievement("level_5", "Rising Pilot", "Reach level 5", "🚀", 20),
        Achievement("level_10", "Star Captain", "Reach level 10", "👨‍✈️", 50),
        Achievement("streak_3", "Regular Flyer", "Play 3 days in a row", "📅", 15),
        Achievement("streak_7", "Dedicated Pilot", "Play 7 days in a row", "📆", 25),
    ]
    
    # Challenge templates
    CHALLENGE_TEMPLATES = [
        {"id": "collect_stars", "title": "Star Collector", "description": "Collect {goal} stars", 
         "goal_range": (10, 30), "reward_range": (20, 50), "category": "collection"},
        {"id": "collect_special", "title": "Special Hunter", "description": "Collect {goal} special stars", 
         "goal_range": (3, 10), "reward_range": (30, 80), "category": "collection"},
        {"id": "play_time", "title": "Flight Time", "description": "Play for {goal} minutes", 
         "goal_range": (5, 20), "reward_range": (15, 40), "category": "engagement"},
        {"id": "high_score", "title": "High Flyer", "description": "Get a score of {goal} in one session", 
         "goal_range": (50, 200), "reward_range": (30, 100), "category": "performance"},
    ]
    
    def __init__(self, db_session):
        """Initialize progression system with database session"""
        self.db = db_session
        self.logger = logging.getLogger("progression")
        
        # Setup JSON logging
        for handler in self.logger.handlers:
            self.logger.removeHandler(handler)
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(json.dumps({
            "timestamp": "%(asctime)s",
            "level": "%(levelname)s",
            "message": "%(message)s",
            "module": "%(module)s",
            "function": "%(funcName)s"
        })))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
        
        # Cache of player progression data
        self.players_cache = {}
        self.active_challenges = self._generate_daily_challenges()
    
    def _generate_daily_challenges(self, count: int = 3) -> List[Challenge]:
        """Generate a set of daily challenges"""
        challenges = []
        template_indices = random.sample(range(len(self.CHALLENGE_TEMPLATES)), min(count, len(self.CHALLENGE_TEMPLATES)))
        
        for idx in template_indices:
            template = self.CHALLENGE_TEMPLATES[idx]
            goal = random.randint(*template["goal_range"])
            reward = random.randint(*template["reward_range"])
            
            challenge = Challenge(
                f"{template['id']}_{int(time.time())}",
                template["title"],
                template["description"].format(goal=goal),
                goal,
                reward,
                template["category"]
            )
            challenges.append(challenge)
        
        self.logger.info("Generated daily challenges", extra={"count": len(challenges)})
        return challenges
    
    def refresh_challenges(self):
        """Refresh expired challenges"""
        if not self.active_challenges or any(c.is_expired() for c in self.active_challenges):
            self.active_challenges = self._generate_daily_challenges()
            self.logger.info("Refreshed challenges", extra={"count": len(self.active_challenges)})
    
    def get_challenges(self) -> List[dict]:
        """Get current active challenges"""
        self.refresh_challenges()
        return [c.to_dict() for c in self.active_challenges]
    
    def get_achievements(self) -> List[dict]:
        """Get all available achievements"""
        return [a.to_dict() for a in self.ACHIEVEMENTS]
    
    async def add_experience(self, user_id: int, amount: int) -> Tuple[int, int, Optional[dict]]:
        """
        Add experience to player and check for level ups
        
        Returns:
            Tuple of (new_total_xp, new_level, achievement_unlocked)
        """
        try:
            # Get current XP and level from database
            user = await self._get_user(user_id)
            if not user:
                self.logger.error("User not found for XP addition", extra={"user_id": user_id})
                return 0, 0, None
            
            current_xp = user.get("experience", 0)
            current_level = user.get("level", 0)
            
            # Calculate new values
            new_xp = current_xp + amount
            new_level = self._calculate_level(new_xp)
            
            # Update in database
            await self._update_user_progression(user_id, new_xp, new_level)
            
            # Check for level-up
            achievement = None
            if new_level > current_level:
                self.logger.info("Player leveled up", extra={
                    "user_id": user_id,
                    "old_level": current_level,
                    "new_level": new_level,
                    "xp_gained": amount,
                    "total_xp": new_xp
                })
                
                # Check for level achievements
                if new_level >= 5:
                    achievement = await self.unlock_achievement(user_id, "level_5")
                if new_level >= 10:
                    achievement = await self.unlock_achievement(user_id, "level_10")
            
            return new_xp, new_level, achievement
        
        except Exception as e:
            self.logger.error("Error adding experience", extra={
                "user_id": user_id,
                "amount": amount,
                "error": str(e)
            })
            return 0, 0, None
    
    def _calculate_level(self, xp: int) -> int:
        """Calculate level based on total XP"""
        level = 0
        while level < len(self.LEVEL_THRESHOLDS) - 1 and xp >= self.LEVEL_THRESHOLDS[level + 1]:
            level += 1
        return level
    
    def get_next_level_xp(self, level: int) -> int:
        """Get XP required for next level"""
        if level >= len(self.LEVEL_THRESHOLDS) - 1:
            return -1  # Max level reached
        return self.LEVEL_THRESHOLDS[level + 1]
    
    async def _get_user(self, user_id: int) -> Optional[dict]:
        """Get user data from database or cache"""
        if user_id in self.players_cache:
            return self.players_cache[user_id]
        
        # In a real implementation, this would fetch from the database
        # For now we'll just return a default user
        user = {
            "id": user_id,
            "experience": 0,
            "level": 0,
            "achievements": [],
            "login_streak": 0,
            "last_login": datetime.now().isoformat()
        }
        self.players_cache[user_id] = user
        return user
    
    async def _update_user_progression(self, user_id: int, xp: int, level: int) -> bool:
        """Update user progression data"""
        # In a real implementation, this would update the database
        try:
            user = await self._get_user(user_id)
            user["experience"] = xp
            user["level"] = level
            self.players_cache[user_id] = user
            return True
        except Exception as e:
            self.logger.error("Failed to update user progression", extra={
                "user_id": user_id,
                "error": str(e)
            })
            return False
    
    async def unlock_achievement(self, user_id: int, achievement_id: str) -> Optional[dict]:
        """
        Unlock an achievement for a user if they don't already have it
        
        Returns:
            Achievement data if newly unlocked, None otherwise
        """
        try:
            user = await self._get_user(user_id)
            if not user:
                return None
            
            # Check if already unlocked
            if achievement_id in user.get("achievements", []):
                return None
            
            # Find achievement
            achievement = next((a for a in self.ACHIEVEMENTS if a.id == achievement_id), None)
            if not achievement:
                self.logger.error("Achievement not found", extra={"achievement_id": achievement_id})
                return None
            
            # Update user achievements
            if "achievements" not in user:
                user["achievements"] = []
            user["achievements"].append(achievement_id)
            
            # Add points for the achievement
            current_xp = user.get("experience", 0)
            new_xp = current_xp + achievement.points
            user["experience"] = new_xp
            user["level"] = self._calculate_level(new_xp)
            
            self.logger.info("Achievement unlocked", extra={
                "user_id": user_id,
                "achievement_id": achievement_id,
                "achievement_title": achievement.title,
                "points_earned": achievement.points
            })
            
            # Return achievement data
            return achievement.to_dict()
        
        except Exception as e:
            self.logger.error("Error unlocking achievement", extra={
                "user_id": user_id,
                "achievement_id": achievement_id,
                "error": str(e)
            })
            return None
    
    async def track_star_collection(self, user_id: int, star_value: int = 1) -> List[dict]:
        """
        Track star collection for achievements and challenges
        
        Returns:
            List of unlocked achievements
        """
        unlocked_achievements = []
        user = await self._get_user(user_id)
        
        if not user:
            return unlocked_achievements
        
        # Update star counts
        total_stars = user.get("total_stars", 0) + 1
        special_stars = user.get("special_stars", 0) + (1 if star_value > 1 else 0)
        
        user["total_stars"] = total_stars
        user["special_stars"] = special_stars
        
        # Check for achievements
        achievement_checks = [
            ("first_star", total_stars >= 1),
            ("collector_10", total_stars >= 10),
            ("collector_50", total_stars >= 50),
            ("collector_100", total_stars >= 100),
            ("special_5", special_stars >= 5),
            ("special_20", special_stars >= 20)
        ]
        
        for achievement_id, condition in achievement_checks:
            if condition:
                achievement = await self.unlock_achievement(user_id, achievement_id)
                if achievement:
                    unlocked_achievements.append(achievement)
        
        # Update challenge progress
        for challenge in self.active_challenges:
            if challenge.category == "collection":
                if "collect_stars" in challenge.id:
                    user[f"challenge_{challenge.id}"] = user.get(f"challenge_{challenge.id}", 0) + 1
                elif "collect_special" in challenge.id and star_value > 1:
                    user[f"challenge_{challenge.id}"] = user.get(f"challenge_{challenge.id}", 0) + 1
        
        return unlocked_achievements
    
    async def update_login_streak(self, user_id: int) -> Tuple[int, Optional[dict]]:
        """
        Update login streak for the user
        
        Returns:
            Tuple of (current_streak, achievement_unlocked)
        """
        user = await self._get_user(user_id)
        if not user:
            return 0, None
        
        # Get last login date
        last_login_str = user.get("last_login", "")
        current_streak = user.get("login_streak", 0)
        
        try:
            last_login = datetime.fromisoformat(last_login_str) if last_login_str else None
            now = datetime.now()
            
            # Calculate streak based on last login
            if not last_login:
                # First login
                new_streak = 1
            elif (now.date() - last_login.date()).days == 1:
                # Consecutive day
                new_streak = current_streak + 1
            elif (now.date() - last_login.date()).days == 0:
                # Same day login, streak doesn't change
                new_streak = current_streak
            else:
                # Streak broken
                new_streak = 1
            
            # Update user
            user["login_streak"] = new_streak
            user["last_login"] = now.isoformat()
            
            # Check for streak achievements
            achievement = None
            if new_streak >= 3:
                achievement = await self.unlock_achievement(user_id, "streak_3")
            if new_streak >= 7:
                achievement = await self.unlock_achievement(user_id, "streak_7")
            
            self.logger.info("Login streak updated", extra={
                "user_id": user_id,
                "previous_streak": current_streak,
                "new_streak": new_streak
            })
            
            return new_streak, achievement
        
        except Exception as e:
            self.logger.error("Error updating login streak", extra={
                "user_id": user_id,
                "error": str(e)
            })
            return current_streak, None
    
    async def get_user_progress(self, user_id: int) -> dict:
        """Get comprehensive user progress data"""
        user = await self._get_user(user_id)
        if not user:
            return {}
        
        # Calculate progress to next level
        current_level = user.get("level", 0)
        current_xp = user.get("experience", 0)
        next_level_xp = self.get_next_level_xp(current_level)
        
        if next_level_xp > 0:
            current_level_xp = self.LEVEL_THRESHOLDS[current_level]
            progress_to_next = (current_xp - current_level_xp) / (next_level_xp - current_level_xp)
            progress_percentage = min(100, max(0, int(progress_to_next * 100)))
        else:
            progress_percentage = 100  # Max level
        
        # Get challenge progress
        challenge_progress = []
        for challenge in self.active_challenges:
            progress = user.get(f"challenge_{challenge.id}", 0)
            is_complete = progress >= challenge.goal
            
            challenge_progress.append({
                **challenge.to_dict(),
                "progress": progress,
                "is_complete": is_complete,
                "progress_percentage": min(100, int((progress / challenge.goal) * 100))
            })
        
        # Get unlocked achievements
        unlocked_achievements = [
            next((a.to_dict() for a in self.ACHIEVEMENTS if a.id == achievement_id), None)
            for achievement_id in user.get("achievements", [])
        ]
        
        # Remove None values (for achievements that might have been deleted)
        unlocked_achievements = [a for a in unlocked_achievements if a]
        
        # Get achievement completion percentage
        achievement_percentage = int((len(unlocked_achievements) / len(self.ACHIEVEMENTS)) * 100)
        
        return {
            "user_id": user_id,
            "level": current_level,
            "experience": current_xp,
            "next_level_xp": next_level_xp,
            "progress_percentage": progress_percentage,
            "login_streak": user.get("login_streak", 0),
            "total_stars": user.get("total_stars", 0),
            "special_stars": user.get("special_stars", 0),
            "challenges": challenge_progress,
            "unlocked_achievements": unlocked_achievements,
            "achievement_percentage": achievement_percentage
        }
