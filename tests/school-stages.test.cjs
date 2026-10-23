const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match } = require('../src/engine.js');
const stages = require('../assets/stages.json');
const IDS = ['hanasakigawa', 'haneoka', 'tsukinomori', 'tsukinomori-garden', 'haneoka-roof', 'circle-studio', 'ring-studio', 'sunshine-steps', 'sunshine-night'];
const fight = terrain => { const m = new Match({ mode: 'duel', terrain, characters: [0, 1] }); m.start();m.advance(1000);return m; };
test('all requested campus and MyGO locations are selectable with distinct terrain routes', () => {
  assert.ok(stages.length >= 15);
  const layouts = new Set();
  for (const id of IDS) {
    const scene = stages.find(s => s.id === id);assert.ok(scene, id);
    assert.ok(scene.layout && scene.category && scene.source, id + ': missing scene details');
    const t = scene.terrain;assert.ok(new Set(t.platforms.map(p => p.height)).size >= 3, id);
    layouts.add(JSON.stringify(t));
  }
  assert.equal(layouts.size, IDS.length);
});
test('new scene decks support landing and down+jump drops onto a lower surface', () => {
  for (const id of IDS) {
    const t = stages.find(s => s.id === id)?.terrain; assert.ok(t, id);
    const m = fight(t), f = m.fighters[0];
    const deck = t.platforms.reduce((a, b) => a.height > b.height ? a : b);
    Object.assign(f, { x: (deck.left + deck.right) / 2, y: deck.height + 18, vy: -100 });
    m.fighters[1].x = f.x < 480 ? 1400 : -600;
    m.advance(200);assert.equal(f.y, deck.height, id + ': landing');assert.ok(m.grounded(f));
    m.advance(10, { crouch: true, jump: true });m.advance(800);
    assert.ok(f.y < deck.height, id + ': cannot drop');assert.ok(m.grounded(f), id + ': lower landing');
    assert.equal(f.hp, 200);
  }
});
test('Sunshine steps form actual rising and descending ground levels that can be walked', () => {
  const m = fight(stages.find(s => s.id === 'sunshine-steps')?.terrain);
  assert.ok(m.floorHeight(480) > m.floorHeight(240) + 70);
  assert.ok(m.floorHeight(480) > m.floorHeight(720) + 70);
  Object.assign(m.fighters[0], { x: 180, y: m.floorHeight(180) });m.fighters[1].x = 1600;
  m.advance(650, { right: true });
  assert.ok(m.fighters[0].y > 70);assert.ok(m.grounded(m.fighters[0]));
  m.advance(1500, { right: true });assert.ok(m.grounded(m.fighters[0]));
  assert.ok(m.fighters[0].y <= 0);
});
