/* Offline character selection and ordered team lineups. */
(function (root) {
  'use strict';
  function createSelectionState(rosterSize) {
    let mode = 'cpu', format = '1v1', teams = [[null], [null]], active = [0, 0];
    const defaults = { arena: 0, difficulty: 1, sound: true, terrain: true, dummy: 'idle' };
    let settings = { ...defaults };
    const valid = id => Number.isInteger(id) && id >= 0 && id < rosterSize;
    const count = () => format === '3v3' ? 3 : 1;
    function nextEmpty() {
      for (let side = 0; side < 2; side++) for (let slot = 0; slot < count(); slot++) {
        if (teams[side][slot] === null) { active = [side, slot]; return; }
      }
    }
    function resize() {
      teams = teams.map(team => Array.from({ length: count() }, (_, i) => team[i] ?? null));
      active = [0, 0]; nextEmpty();
    }
    return {
      open(options = {}) {
        settings = { ...defaults, ...options.settings };
        mode = ['cpu', 'duel', 'practice'].includes(options.mode) ? options.mode : 'cpu';
        format = mode !== 'practice' && options.format === '3v3' ? '3v3' : '1v1';
        teams = [0, 1].map(side => {
          const seen = new Set();
          return Array.from({ length: count() }, (_, slot) => {
            const id = options.teams?.[side]?.[slot];
            if (!valid(id) || seen.has(id)) return null;
            seen.add(id); return id;
          });
        });
        active = [0, 0]; nextEmpty();
      },
      selectSlot(side, slot) {
        if ((side === 0 || side === 1) && Number.isInteger(slot) && slot >= 0 && slot < count()) active = [side, slot];
      },
      clearSlot(side, slot) {
        if ((side !== 0 && side !== 1) || !Number.isInteger(slot) || slot < 0 || slot >= count()) return;
        teams[side][slot] = null; active = [side, slot];
      },
      pick(id) {
        if (!valid(id) || teams[active[0]].some((pick, slot) => pick === id && slot !== active[1])) return false;
        teams[active[0]][active[1]] = id; nextEmpty(); return true;
      },
      setFormat(value) { format = mode !== 'practice' && value === '3v3' ? '3v3' : '1v1'; resize(); },
      setMode(value) {
        if (!['cpu', 'duel', 'practice'].includes(value)) return;
        mode = value; if (mode === 'practice') { format = '1v1'; resize(); }
      },
      setSettings(changes) { settings = { ...settings, ...changes }; },
      isComplete() { return teams.every(team => team.every(valid)); },
      snapshot() { return { mode, format, characters: teams.map(team => team[0]), teams: teams.map(team => team.slice()), active: active.slice(), settings: { ...settings } }; },
    };
  }
  function createSelectionScreen({ root: element, roster, assets, onConfirm, onBack }) {
    const document = element.ownerDocument, state = createSelectionState(roster.length);
    const find = id => element.querySelector('#' + id);
    const back = find('selection-back'), confirm = find('selection-confirm');
    const modeSelect = find('selection-mode'), formatSelect = find('selection-format');
    const difficultySelect = find('selection-difficulty'), soundToggle = find('selection-sound');
    const terrainToggle = find('selection-terrain'), dummySelect = find('selection-dummy');
    const stageChoices = find('selection-stage-choices');
    const stagePrev = find('selection-stage-prev'), stageNext = find('selection-stage-next');
    const status = find('selection-status'), error = find('selection-error');
    const order = ['先锋', '中坚', '大将'];
    const rosterButtons = [], teamRoots = [find('selection-team-0'), find('selection-team-1')];
    let opened = false, busy = false, request = 0, previewId = 6, previewForm = 'normal';
    function node(tag, className, text) {
      const result = document.createElement(tag); if (className) result.className = className;
      if (text !== undefined) result.textContent = text; return result;
    }
    function portrait(id, className) {
      const image = node('img', className); image.src = assets.mujicaPortraits?.[id]?.normal.face || assets.characters[id].portrait;
      image.classList.toggle('portrait-closeup', !!assets.mujicaPortraits?.[id]);
      // Center the face rather than the full drawing's hair, guitar or outstretched limbs.
      const focusX = [.58, .59, .62, .40, .59, .36, .63, .38, .46, .49, .65, .35, .67, .54, .52];
      image.style.setProperty('--portrait-focus-x', focusX[id]);
      image.alt = ''; image.draggable = false; image.decoding = 'async'; return image;
    }
    function preview(id, form = previewForm) {
      previewId = id; previewForm = assets.mujicaPortraits?.[id] ? form : 'normal';
      const profile = roster[id], art = assets.mujicaPortraits?.[id]?.[previewForm];
      const panel = find('selection-spotlight'); panel.dataset.character = id; panel.dataset.form = previewForm;
      panel.style.setProperty('--cast-color', profile.color || '#bca7d6');
      find('spotlight-image').src = art?.portrait || assets.characters[id].portrait;
      find('spotlight-image').alt = profile.name + (previewForm === 'stage' ? '演出服立绘' : '常态立绘');
      find('spotlight-band').textContent = profile.band === 'mujica' ? 'AVE MUJICA' : profile.band === 'mewtype' ? '夢限大 MewType' : 'MyGO!!!!!';
      find('spotlight-name').textContent = profile.name;
      find('spotlight-alias').textContent = previewForm === 'stage' ? profile.stageName : '';
      find('spotlight-role').textContent = [profile.role, profile.archetype].filter(Boolean).join(' / ');
      find('spotlight-forms').hidden = !assets.mujicaPortraits?.[id];
      find('spotlight-transform').textContent = profile.band === 'mujica' ? 'H 戴上面具 · 50共鸣 / 20秒' : id === 2 ? 'H 凑企鹅 · 50共鸣 / 20秒' : '';
      for (const button of element.querySelectorAll('[data-preview-form]')) {
        button.setAttribute('aria-pressed', String(button.dataset.previewForm === previewForm)); button.disabled = busy;
      }
      const fighter = { character: id, ...(previewForm === 'stage' ? { stageForm: { ms: 20000 } } : {}) };
      const scheme = root.MygoControls.schemeFor(fighter), moves = root.MygoFighter.MOVES;
      const list = find('spotlight-skills'); list.replaceChildren();
      [...scheme.base, scheme.super].forEach((key, i) => {
        if (!key) return;
        const item = node('div'); item.append(node('dt', '', ['U', 'I', 'O', 'P'][i]), node('dd', '', moves[key].name)); list.append(item);
      });
      for (const [direction, key] of Object.entries(scheme.variants || {})) {
        if (!['down1', 'down2'].includes(direction)) continue;
        const item = node('div'); item.append(node('dt', '', direction === 'down1' ? '↓U' : '↓I'), node('dd', '', moves[key].name)); list.append(item);
      }
      for (const [character, button] of rosterButtons) button.classList.toggle('previewing', character === id);
    }
    for (const button of element.querySelectorAll('[data-preview-form]')) button.addEventListener('click', () => {
      if (!busy) preview(previewId, button.dataset.previewForm);
    });
    const stageButtons = assets.stages.map((scene, index) => {
      const button = node('button', 'selection-stage'); button.type = 'button';
      button.dataset.selectionStage = index;
      button.setAttribute('aria-label', scene.name + ' · ' + scene.layout);
      const image = node('img'); image.src = scene.thumbnail; image.alt = ''; image.draggable = false;
      image.width = 320; image.height = 180;
      button.append(image, node('span', '', scene.name));
      button.addEventListener('click', () => { if (!busy) { state.setSettings({ arena: index }); renderSettings(); } });
      find('selection-stage-choices').append(button);
      return button;
    });
    function renderSettings() {
      const { mode, settings } = state.snapshot();
      difficultySelect.value = settings.difficulty;
      difficultySelect.disabled = busy || mode !== 'cpu';
      find('selection-difficulty-hint').textContent = mode === 'cpu' ? '选择电脑对手强度' : '仅单人对战生效';
      soundToggle.checked = settings.sound; soundToggle.disabled = busy;
      terrainToggle.checked = settings.terrain; terrainToggle.disabled = busy;
      dummySelect.value = settings.dummy; dummySelect.disabled = busy;
      find('selection-practice-settings').hidden = mode !== 'practice';
      const scene = assets.stages[settings.arena];
      find('selection-stage-image').src = scene.thumbnail;
      find('selection-stage-image').alt = scene.name;
      find('selection-stage-name').textContent = scene.name;
      find('selection-stage-layout').textContent = settings.terrain ? scene.layout : '平坦场地';
      find('selection-summary').textContent = `${scene.name} · ${mode === 'cpu' ? ['轻松', '标准', '认真'][settings.difficulty] : mode === 'duel' ? '本地双人' : '自由练习'} · ${settings.sound ? '音效开' : '静音'} · ${settings.terrain ? '分层地形' : '平坦场地'}`;
      stageButtons.forEach((button, index) => {
        const selected = index === settings.arena;
        button.disabled = busy; button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      updateStageNavigation();
    }
    function updateStageNavigation() {
      stagePrev.disabled = busy || stageChoices.scrollLeft <= 1;
      stageNext.disabled = busy || stageChoices.scrollLeft + stageChoices.clientWidth >= stageChoices.scrollWidth - 1;
    }
    stageChoices.addEventListener('scroll', updateStageNavigation);
    root.addEventListener('resize', updateStageNavigation);
    for (const [button, direction] of [[stagePrev, -1], [stageNext, 1]]) button.addEventListener('click', () => {
      stageChoices.scrollBy({ left: direction * stageChoices.clientWidth * .8,
        behavior: root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    const bandNames = ['MyGO!!!!!', 'Ave Mujica', '梦限大 MewType'];
    for (let band = 0; band < 3; band++) {
      const group = node('section', 'selection-band');
      const heading = node('h3', '', bandNames[band]); heading.id = 'selection-band-' + band;
      group.setAttribute('aria-labelledby', heading.id); group.append(heading);
      const grid = node('div', 'selection-band-grid'); group.append(grid);
      const ids = band === 1 ? [6, 7, 5, 8, 9] : Array.from({ length: 5 }, (_, i) => band * 5 + i);
      for (const id of ids.filter(id => id < roster.length)) {
        const button = node('button', 'selection-character'); button.type = 'button'; button.dataset.character = id;
        button.setAttribute('aria-label', roster[id].name);
        button.append(portrait(id, 'selection-portrait'), node('strong', '', roster[id].name), node('small', 'selection-pick-tags'));
        button.addEventListener('pointerenter', () => { if (!busy) preview(id); });
        button.addEventListener('focus', () => { if (!busy) preview(id); });
        button.addEventListener('click', () => { if (!busy && state.pick(id)) { error.textContent = ''; preview(id); render(); } });
        rosterButtons.push([id, button]); grid.append(button);
      }
      find('selection-roster').append(group);
    }
    function render() {
      renderSettings();
      const snapshot = state.snapshot(), activeSide = snapshot.active[0], activeSlot = snapshot.active[1];
      element.dataset.format = snapshot.format; element.dataset.side = activeSide;
      element.setAttribute('aria-busy', String(busy));
      modeSelect.value = snapshot.mode; formatSelect.value = snapshot.format;
      modeSelect.disabled = busy; formatSelect.disabled = busy || snapshot.mode === 'practice';
      back.disabled = busy; confirm.disabled = busy || !state.isComplete();
      const selectedCount = snapshot.teams.flat().filter(id => id !== null).length;
      find('selection-count').textContent = `${selectedCount} / ${snapshot.teams.flat().length}`;
      element.classList.toggle('lineup-ready', state.isComplete());
      element.querySelector('.selection-steps a:first-child').setAttribute('aria-current', state.isComplete() ? 'false' : 'step');
      element.querySelector('.selection-steps a:nth-child(2)').setAttribute('aria-current', state.isComplete() ? 'step' : 'false');
      for (const button of element.querySelectorAll('[data-preview-form]')) button.disabled = busy;
      confirm.textContent = busy ? '正在准备对战…' : snapshot.mode === 'practice' ? '开始练习 ↗' : '开始对战 ↗';
      find('selection-title').textContent = snapshot.format === '3v3' ? '选择出战阵容' : '选择对战角色';
      status.textContent = state.isComplete() ? '阵容已就绪' : `${activeSide === 0 ? '1P' : snapshot.mode === 'cpu' ? 'CPU' : '2P'} · 请选择${snapshot.format === '3v3' ? order[activeSlot] : '角色'}`;
      for (let side = 0; side < 2; side++) {
        const teamRoot = teamRoots[side]; teamRoot.replaceChildren();
        find('selection-side-' + side).textContent = side === 0 ? '1P' : snapshot.mode === 'cpu' ? 'CPU' : snapshot.mode === 'practice' ? '木桩' : '2P';
        snapshot.teams[side].forEach((id, slot) => {
          const item = node('div', 'selection-slot' + (side === activeSide && slot === activeSlot ? ' active' : '') + (id === null ? ' empty' : ''));
          const pick = node('button', 'selection-slot-pick'); pick.type = 'button'; pick.disabled = busy;
          pick.dataset.side = side; pick.dataset.slot = slot;
          const slotName = snapshot.format === '3v3' ? order[slot] : '出战角色';
          pick.setAttribute('aria-label', `${side + 1}P ${slotName}：${id === null ? '未选择' : roster[id].name}，点击更换`);
          pick.setAttribute('aria-pressed', String(side === activeSide && slot === activeSlot));
          pick.append(node('span', 'selection-slot-order', snapshot.format === '3v3' ? `0${slot + 1} / ${slotName}` : slotName));
          if (id !== null) pick.append(portrait(id, 'selection-slot-portrait'));
          else pick.append(node('span', 'selection-slot-empty', '+'));
          pick.append(node('strong', '', id === null ? '选择角色' : roster[id].name));
          pick.addEventListener('click', () => { state.selectSlot(side, slot); if (id !== null) preview(id); render(); teamRoots[side].querySelector(`[data-slot="${slot}"]`).focus(); });
          item.append(pick);
          if (id !== null) {
            const remove = node('button', 'selection-slot-remove', '×'); remove.type = 'button'; remove.disabled = busy;
            remove.setAttribute('aria-label', `移除${roster[id].name}`);
            remove.addEventListener('click', () => { state.clearSlot(side, slot); render(); teamRoots[side].querySelector(`[data-slot="${slot}"]`).focus(); }); item.append(remove);
          }
          teamRoot.append(item);
        });
      }
      for (const [id, button] of rosterButtons) {
        const sameTeam = snapshot.teams[activeSide];
        button.disabled = busy || sameTeam.some((pick, slot) => pick === id && slot !== activeSlot);
        button.classList.toggle('picked-p1', snapshot.teams[0].includes(id));
        button.classList.toggle('picked-p2', snapshot.teams[1].includes(id));
        button.setAttribute('aria-pressed', String(sameTeam[activeSlot] === id));
        button.querySelector('small').textContent = snapshot.teams.map((team, side) => {
          const slot = team.indexOf(id); return slot < 0 ? '' : `${side === 0 ? '1P' : snapshot.mode === 'cpu' ? 'CPU' : '2P'}${snapshot.format === '3v3' ? '·' + order[slot] : ''}`;
        }).filter(Boolean).join(' / ');
      }
    }
    function close() { request++; busy = false; opened = false; element.hidden = true; element.inert = true; }
    function goBack() { if (busy) return; close(); if (onBack) onBack(); }
    back.addEventListener('click', goBack);
    element.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); goBack(); } });
    modeSelect.addEventListener('change', () => { if (!busy) { state.setMode(modeSelect.value); error.textContent = ''; render(); } });
    formatSelect.addEventListener('change', () => { if (!busy) { state.setFormat(formatSelect.value); error.textContent = ''; render(); } });
    for (const [control, key, read] of [
      [difficultySelect, 'difficulty', () => Number(difficultySelect.value)],
      [soundToggle, 'sound', () => soundToggle.checked],
      [terrainToggle, 'terrain', () => terrainToggle.checked],
      [dummySelect, 'dummy', () => dummySelect.value],
    ]) control.addEventListener('change', () => { if (!busy) { state.setSettings({ [key]: read() }); renderSettings(); } });
    confirm.addEventListener('click', async () => {
      if (busy || !opened || !state.isComplete()) return;
      busy = true; error.textContent = ''; const token = ++request; render();
      const { active, ...payload } = state.snapshot();
      try {
        const result = await onConfirm(payload);
        if (token !== request) return;
        if (result === false) throw new Error('未能开始对战，请重试。');
        close();
      } catch (failure) {
        if (token !== request) return;
        busy = false; error.textContent = failure?.message || '未能开始对战，请重试。'; render(); confirm.focus();
      }
    });
    return {
      open(options = {}) { request++; busy = false; state.open(options); opened = true; element.hidden = false; element.inert = false; error.textContent = ''; render(); preview(options.teams?.[0]?.[0] ?? options.characters?.[0] ?? 6, 'normal'); stageButtons[state.snapshot().settings.arena].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }); back.focus({ preventScroll: true }); },
      close,
      get isOpen() { return opened; },
      snapshot() { return { ...state.snapshot(), isOpen: opened, busy }; },
    };
  }
  const api = { createSelectionState, createSelectionScreen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MygoSelection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
