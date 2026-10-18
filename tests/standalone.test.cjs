const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('every stage asset is inside this standalone repository', () => {
  const root = path.resolve(__dirname, '..');
  const stages = JSON.parse(fs.readFileSync(path.join(root, 'assets/stages.json'), 'utf8'));
  for (const stage of stages) {
    const file = path.resolve(root, stage.file);
    const relative = path.relative(root, file);
    assert(!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep), stage.id + ' depends on another repository');
    assert(fs.statSync(file).isFile(), stage.id + ' asset is missing');
  }
});
