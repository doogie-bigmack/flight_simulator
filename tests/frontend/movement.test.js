import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeNewPosition, isColliding } from '../../client/main.js';

test('computeNewPosition moves up', () => {
  const pos = { x: 0, y: 0 };
  const newPos = computeNewPosition(pos, 'up');
  assert.ok(newPos.y > pos.y);
});

test('computeNewPosition clamps to bounds', () => {
  const pos = { x: 5, y: 5 };
  const newPos = computeNewPosition(pos, 'up');
  assert.equal(newPos.y, 5);
});

test('isColliding detects overlap', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 0.1, y: 0.1 };
  assert.ok(isColliding(p1, p2, 0.5));
});
