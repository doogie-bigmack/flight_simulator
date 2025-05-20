/**
 * Tests for aircraft movement and collision detection
 */
import { computeNewPosition, isColliding, isInBounds, getClosestObject } from '../../client/js/movement.js';

describe('Aircraft Movement', () => {
  describe('computeNewPosition', () => {
    test('moves aircraft up when up direction is provided', () => {
      const pos = { x: 0, y: 0 };
      const newPos = computeNewPosition(pos, 'up');
      expect(newPos.y).toBeGreaterThan(pos.y);
    });

    test('moves aircraft down when down direction is provided', () => {
      const pos = { x: 0, y: 0 };
      const newPos = computeNewPosition(pos, 'down');
      expect(newPos.y).toBeLessThan(pos.y);
    });

    test('moves aircraft left when left direction is provided', () => {
      const pos = { x: 5, y: 0 };
      const newPos = computeNewPosition(pos, 'left');
      expect(newPos.x).toBeLessThan(pos.x);
    });

    test('moves aircraft right when right direction is provided', () => {
      const pos = { x: 0, y: 0 };
      const newPos = computeNewPosition(pos, 'right');
      expect(newPos.x).toBeGreaterThan(pos.x);
    });

    test('clamps position to maximum bounds', () => {
      const pos = { x: 95, y: 95 };
      const newPos = computeNewPosition(pos, 'right');
      expect(newPos.x).toBeLessThanOrEqual(100);
    });

    test('clamps position to minimum bounds', () => {
      const pos = { x: 5, y: 5 };
      const newPos = computeNewPosition(pos, 'left');
      expect(newPos.x).toBeGreaterThanOrEqual(0);
    });

    test('returns the same position for invalid direction', () => {
      const pos = { x: 10, y: 10 };
      const newPos = computeNewPosition(pos, 'invalid');
      expect(newPos).toEqual(pos);
    });
  });

  describe('Collision Detection', () => {
    test('detects collision when objects overlap', () => {
      const obj1 = { x: 10, y: 10 };
      const obj2 = { x: 10.2, y: 10.2 };
      expect(isColliding(obj1, obj2, 0.5)).toBe(true);
    });

    test('does not detect collision when objects are far apart', () => {
      const obj1 = { x: 0, y: 0 };
      const obj2 = { x: 10, y: 10 };
      expect(isColliding(obj1, obj2, 1)).toBe(false);
    });

    test('collision distance is customizable', () => {
      const obj1 = { x: 0, y: 0 };
      const obj2 = { x: 3, y: 0 };
      expect(isColliding(obj1, obj2, 2)).toBe(false);
      expect(isColliding(obj1, obj2, 4)).toBe(true);
    });
  });

  describe('Boundary Checking', () => {
    test('identifies positions within boundaries', () => {
      expect(isInBounds({ x: 0, y: 0 })).toBe(true);
      expect(isInBounds({ x: 4, y: 4 })).toBe(true);
      expect(isInBounds({ x: -4, y: 4 })).toBe(true);
      expect(isInBounds({ x: 4, y: -4 })).toBe(true);
      expect(isInBounds({ x: -4, y: -4 })).toBe(true);
    });

    test('identifies positions outside boundaries', () => {
      expect(isInBounds({ x: 6, y: 0 })).toBe(false);
      expect(isInBounds({ x: -6, y: 0 })).toBe(false);
      expect(isInBounds({ x: 0, y: 6 })).toBe(false);
      expect(isInBounds({ x: 0, y: -6 })).toBe(false);
      expect(isInBounds({ x: 10, y: 10 })).toBe(false);
    });

    test('recognizes boundary edges as in-bounds', () => {
      expect(isInBounds({ x: 5, y: 0 })).toBe(true);
      expect(isInBounds({ x: -5, y: 0 })).toBe(true);
      expect(isInBounds({ x: 0, y: 5 })).toBe(true);
      expect(isInBounds({ x: 0, y: -5 })).toBe(true);
      expect(isInBounds({ x: 5, y: 5 })).toBe(true);
      expect(isInBounds({ x: -5, y: -5 })).toBe(true);
    });
  });

  describe('Closest Object Detection', () => {
    test('finds the closest object in an array', () => {
      const position = { x: 0, y: 0 };
      const objects = [
        { x: 5, y: 5 },
        { x: 3, y: 0 },
        { x: 10, y: 10 }
      ];
      
      const closest = getClosestObject(position, objects);
      expect(closest).toEqual({ x: 3, y: 0 });
    });

    test('returns the only object when array has one item', () => {
      const position = { x: 0, y: 0 };
      const objects = [{ x: 5, y: 5 }];
      
      const closest = getClosestObject(position, objects);
      expect(closest).toEqual({ x: 5, y: 5 });
    });

    test('returns null for empty array', () => {
      const position = { x: 0, y: 0 };
      const closest = getClosestObject(position, []);
      expect(closest).toBeNull();
    });

    test('returns null for null input', () => {
      const position = { x: 0, y: 0 };
      const closest = getClosestObject(position, null);
      expect(closest).toBeNull();
    });

    test('handles objects with matching distances correctly', () => {
      const position = { x: 0, y: 0 };
      const objects = [
        { x: 3, y: 0 },
        { x: 0, y: 3 },
        { x: -3, y: 0 }
      ];
      
      // Should return the first one found at equal distance
      const closest = getClosestObject(position, objects);
      expect(closest).toEqual({ x: 3, y: 0 });
    });
  });
});
