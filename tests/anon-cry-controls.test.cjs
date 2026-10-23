const {test} = require('node:test');
const assert = require('node:assert/strict');
const {schemeFor, resolveSkill, bindingList} = require('../src/controls.js');

test('Anon back U is the new cry wave on either facing, with accurate throw help', () => {
  for (const facing of [-1, 1]) {
    const f = {character: 0, facing};
    assert.equal(schemeFor(f).variants.back1, 'anonCry');
    assert.equal(resolveSkill(f, {left: facing > 0, right: facing < 0}, k => k === 'skill1', false), 'anonCry');
    const list = bindingList(f);
    assert.ok(list.some(r => r.move === 'anonCry' && r.key === '后＋U'));
    assert.ok(list.some(r => r.move === 'throw' && r.key === '前＋O'));
    assert.ok(!list.some(r => r.move === 'throw' && r.key.includes('后＋U')));
  }
});

test('other characters retain their own back U throw and Anon retains three base skills', () => {
  assert.deepEqual(schemeFor({character: 0}).base, ['shield', 'wave', 'special']);
  for (let character = 1; character < 15; character++) {
    assert.equal(resolveSkill({character, facing: 1}, {left: true}, k => k === 'skill1', false), 'throw');
  }
});
