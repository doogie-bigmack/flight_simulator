import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeNewPosition } from '../../client/main.js';

test('computeNewPosition moves up', () => {
  const pos = { x: 0, y: 0 };
  const newPos = computeNewPosition(pos, 'up');
  assert.ok(newPos.y > pos.y);
});
