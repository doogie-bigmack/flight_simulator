/**
 * Movement and collision functions for the flight simulator
 */

const DEFAULT_SPEED = 0.1;
const MIN_BOUNDARY = -5;
const MAX_BOUNDARY = 5;

/**
 * Calculate new position based on current position and movement command
 * @param {Object} pos - Current position {x, y}
 * @param {string} command - Direction command (up, down, left, right)
 * @param {number} speed - Movement speed (optional)
 * @returns {Object} New position {x, y}
 */
export function computeNewPosition(pos, command, speed = DEFAULT_SPEED) {
  const newPos = { ...pos };
  
  switch (command) {
    case 'up':
      newPos.y += speed;
      break;
    case 'down':
      newPos.y -= speed;
      break;
    case 'left':
      newPos.x -= speed;
      break;
    case 'right':
      newPos.x += speed;
      break;
    default:
      // No valid command, return original position
      return newPos;
  }
  
  // Clamp position to boundaries
  newPos.x = Math.min(MAX_BOUNDARY, Math.max(MIN_BOUNDARY, newPos.x));
  newPos.y = Math.min(MAX_BOUNDARY, Math.max(MIN_BOUNDARY, newPos.y));
  
  return newPos;
}

/**
 * Check if two objects are colliding
 * @param {Object} p1 - First object position {x, y}
 * @param {Object} p2 - Second object position {x, y}
 * @param {number} threshold - Collision distance threshold
 * @returns {boolean} True if objects are colliding
 */
export function isColliding(p1, p2, threshold = 0.5) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

/**
 * Check if a position is within game boundaries
 * @param {Object} pos - Position to check {x, y}
 * @returns {boolean} True if within boundaries
 */
export function isInBounds(pos) {
  return pos.x >= MIN_BOUNDARY && pos.x <= MAX_BOUNDARY && 
         pos.y >= MIN_BOUNDARY && pos.y <= MAX_BOUNDARY;
}

/**
 * Get the closest object to a position
 * @param {Object} pos - Reference position {x, y}
 * @param {Array} objects - Array of objects with x and y properties
 * @returns {Object|null} Closest object or null if array is empty
 */
export function getClosestObject(pos, objects) {
  if (!objects || objects.length === 0) return null;
  
  return objects.reduce((closest, current) => {
    const closestDist = Math.hypot(closest.x - pos.x, closest.y - pos.y);
    const currentDist = Math.hypot(current.x - pos.x, current.y - pos.y);
    return currentDist < closestDist ? current : closest;
  }, objects[0]);
}
