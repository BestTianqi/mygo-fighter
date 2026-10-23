const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSelectionState } = require('../src/selection.js');
const make = () => createSelectionState(15);

test('selection carries match settings independently of lineup and mode changes', () => {
  const state = make(); state.open();
  assert.deepEqual(state.snapshot().settings, { arena: 0, difficulty: 1, sound: true, terrain: true, dummy: 'idle' });
  state.setSettings({ arena: 13, difficulty: 2, sound: false, terrain: false, dummy: 'guard' });
  state.pick(0); state.pick(1); state.setFormat('3v3'); state.setMode('practice'); state.setMode('cpu');
  assert.deepEqual(state.snapshot().settings, { arena: 13, difficulty: 2, sound: false, terrain: false, dummy: 'guard' });
  assert.deepEqual(state.snapshot().teams, [[0], [1]]);
});

test('settings drafts do not modify their seed or later openings', () => {
  const state = make(), settings = { arena: 6, sound: false };
  state.open({ settings }); state.setSettings({ arena: 9, sound: true });
  assert.deepEqual(settings, { arena: 6, sound: false });
  const snapshot = state.snapshot(); snapshot.settings.arena = 14;
  assert.equal(state.snapshot().settings.arena, 9);
  state.open({ settings }); assert.equal(state.snapshot().settings.arena, 6);
  assert.equal(state.snapshot().settings.sound, false);
});
test('selection opens with empty slots even when current fighters are provided', () => {
  const state = make(); state.open({ mode: 'cpu', characters: [0, 1] });
  assert.deepEqual(state.snapshot().teams, [[null], [null]]);
  assert.equal(state.isComplete(), false);
});
test('three ordered picks per side advance through both teams and allow mirrored teams', () => {
  const state = make(); state.open({ mode: 'duel', format: '3v3' });
  for (const id of [0, 1, 2, 0, 1, 2]) assert.equal(state.pick(id), true);
  assert.equal(state.isComplete(), true);
  assert.deepEqual(state.snapshot().teams, [[0, 1, 2], [0, 1, 2]]);
});
test('a duplicate within one side is rejected without moving the active slot', () => {
  const state = make(); state.open({ format: '3v3' }); state.pick(0);
  assert.equal(state.pick(0), false);
  assert.deepEqual(state.snapshot().active, [0, 1]);
  assert.deepEqual(state.snapshot().teams[0], [0, null, null]);
});
test('filled slots can be edited or cleared and confirmation requires a full lineup', () => {
  const state = make(); state.open({ format: '3v3', teams: [[0, 1, 2], [3, 4, 5]] });
  state.selectSlot(0, 1); state.pick(6);
  assert.deepEqual(state.snapshot().teams[0], [0, 6, 2]);
  state.clearSlot(1, 2); assert.equal(state.isComplete(), false);
  assert.deepEqual(state.snapshot().active, [1, 2]); state.pick(7);
  assert.equal(state.isComplete(), true);
});
test('practice always uses one slot and switching formats never silently fills teammates', () => {
  const state = make(); state.open({ mode: 'practice', format: '3v3' });
  assert.equal(state.snapshot().format, '1v1'); state.setFormat('3v3');
  assert.equal(state.snapshot().format, '1v1');
  state.setMode('cpu'); state.pick(0); state.pick(1); state.setFormat('3v3');
  assert.deepEqual(state.snapshot().teams, [[0, null, null], [1, null, null]]);
  assert.equal(state.isComplete(), false);
});
test('explicit seeds validate IDs and duplicates; snapshots cannot mutate picks', () => {
  const state = make(); state.open({ format: '3v3', teams: [[0, 0, 99], [14, -1, 3]] });
  assert.deepEqual(state.snapshot().teams, [[0, null, null], [14, null, 3]]);
  const snapshot = state.snapshot(); snapshot.teams[0][0] = 8;
  assert.equal(state.snapshot().teams[0][0], 0);
  assert.equal(state.pick(NaN), false); assert.equal(state.pick(15), false);
});
