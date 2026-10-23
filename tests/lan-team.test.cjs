const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLanServer } = require('../server/lan-server.cjs');

function sseText(messages) { return messages.join(''); }
function eventPayload(text, name) {
  const match = text.match(new RegExp('event: ' + name + '\\ndata: ([^\\n]+)'));
  return match ? JSON.parse(match[1]) : null;
}

test('LAN 3v3 relay: host picks format, both sides pick ordered teams, and the match starts as a team battle', async () => {
  const server = createLanServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (name, data = {}) => {
    const res = await fetch(base + '/api/' + name, { method: 'POST', body: JSON.stringify(data) });
    return { status: res.status, ...(await res.json()) };
  };
  const controllers = [];
  try {
    const a = await api('create');
    const b = await api('join', { code: a.room.code });
    assert.equal(a.room.format, '1v1');

    const streams = [];
    for (const p of [a, b]) {
      const controller = new AbortController(); controllers.push(controller);
      const res = await fetch(base + '/api/stream?token=' + p.token, { signal: controller.signal });
      const messages = []; streams.push(messages);
      (async () => { try { for await (const chunk of res.body) messages.push(Buffer.from(chunk).toString()); } catch {} })();
    }
    await new Promise(r => setTimeout(r, 60));

    assert.equal((await api('choose', { token: b.token, format: '3v3' })).status, 400);
    assert.equal((await api('choose', { token: a.token, format: '4v4' })).status, 400);
    assert.equal((await api('choose', { token: a.token, format: '3v3' })).status, 200);
    assert.equal((await api('choose', { token: a.token, team: [0, 0, 1] })).status, 400);
    assert.equal((await api('choose', { token: a.token, team: [0, 1] })).status, 400);
    assert.equal((await api('choose', { token: a.token, team: [16, 1, 2] })).status, 400);
    assert.equal((await api('choose', { token: a.token, team: [0, 1, 2] })).status, 200);
    assert.equal((await api('choose', { token: b.token, team: [3, 4, 5] })).status, 200);

    await api('ready', { token: a.token, ready: true });
    await api('ready', { token: b.token, ready: true });
    await new Promise(r => setTimeout(r, 100));

    const prepare = eventPayload(sseText(streams[0]), 'prepare');
    assert.ok(prepare, 'prepare packet should reach the host');
    assert.equal(prepare.config.format, '3v3');
    assert.deepEqual(prepare.config.teams, [[0, 1, 2], [3, 4, 5]]);
    assert.deepEqual(prepare.config.characters, [0, 3]);

    for (const p of [a, b]) await api('loaded', { token: p.token, generation: prepare.generation });
    await new Promise(r => setTimeout(r, 200));

    const state = eventPayload(sseText(streams[0]), 'state');
    assert.ok(state, 'state packet should reach the host');
    assert.equal(state.state.options.format, '3v3');
    assert.deepEqual(state.state.teams, [[0, 1, 2], [3, 4, 5]]);
    assert.deepEqual(state.state.teamIndices, [0, 0]);
    assert.deepEqual(state.state.fighters.map(f => f.character), [0, 3]);

    await api('leave', { token: a.token });
  } finally {
    controllers.forEach(c => c.abort());
    server.shutdown(); server.closeAllConnections();
  }
});

test('LAN 3v3 relay: the room keeps lineups and falls back to 1v1 state when the host switches back', async () => {
  const server = createLanServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (name, data = {}) => {
    const res = await fetch(base + '/api/' + name, { method: 'POST', body: JSON.stringify(data) });
    return { status: res.status, ...(await res.json()) };
  };
  const controllers = [];
  const streams = [];
  try {
    const a = await api('create');
    const b = await api('join', { code: a.room.code });
    for (const p of [a, b]) {
      const controller = new AbortController(); controllers.push(controller);
      const res = await fetch(base + '/api/stream?token=' + p.token, { signal: controller.signal });
      const messages = []; streams.push(messages);
      (async () => { try { for await (const chunk of res.body) messages.push(Buffer.from(chunk).toString()); } catch {} })();
    }
    await new Promise(r => setTimeout(r, 60));
    await api('choose', { token: a.token, format: '3v3' });
    await api('choose', { token: a.token, team: [10, 11, 12] });
    await api('choose', { token: b.token, team: [13, 14, 10] });

    assert.equal((await api('choose', { token: a.token, format: '1v1' })).status, 200);
    assert.equal((await api('choose', { token: a.token, character: 4 })).status, 200);

    await api('ready', { token: a.token, ready: true });
    await api('ready', { token: b.token, ready: true });
    await new Promise(r => setTimeout(r, 100));
    const prepare = eventPayload(sseText(streams[0]), 'prepare');
    assert.ok(prepare);
    assert.equal(prepare.config.format, '1v1');
    assert.deepEqual(prepare.config.characters, [4, 13]);
    assert.equal(prepare.config.teams, undefined);
    await api('leave', { token: b.token });
  } finally {
    controllers.forEach(c => c.abort());
    server.shutdown(); server.closeAllConnections();
  }
});
