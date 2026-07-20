const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = '/Users/reuben/Desktop/TOEFL junior/Primary_Step 1_Custom_Exam Files';
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class ClassList {
  constructor() {
    this.set = new Set();
  }
  add(...names) { names.forEach(name => this.set.add(name)); }
  remove(...names) { names.forEach(name => this.set.delete(name)); }
  toggle(name, force) {
    if (force === true) { this.set.add(name); return true; }
    if (force === false) { this.set.delete(name); return false; }
    if (this.set.has(name)) { this.set.delete(name); return false; }
    this.set.add(name);
    return true;
  }
  contains(name) { return this.set.has(name); }
}

class Element {
  constructor(id = null, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.checked = false;
    this.disabled = false;
    this.style = { display: '' };
    this.classList = new ClassList();
    this.listeners = {};
    this.parentElement = null;
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  dispatch(type) {
    (this.listeners[type] || []).forEach(handler => handler({ target: this }));
  }
  closest(selector) {
    if (selector === '.choice-label') return this.parentElement;
    return null;
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  scrollIntoView() {}
  click() {}
}

class LabelElement extends Element {
  constructor(input) {
    super(null, 'label');
    this.input = input;
    input.parentElement = this;
  }
  querySelector(selector) {
    if (selector === 'input') return this.input;
    return null;
  }
}

class AudioWrap extends Element {
  constructor(missing) {
    super(null, 'div');
    this.missing = missing;
  }
  querySelector(selector) {
    if (selector === '.missing-audio') return this.missing;
    return null;
  }
}

class AudioElement extends Element {
  constructor(expected) {
    super(null, 'audio');
    this.expected = expected;
  }
}

class SessionStorageMock {
  constructor(seed = {}) {
    this.store = { ...seed };
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

class DocumentMock {
  constructor(config) {
    this.byId = new Map();
    this.inputs = [];
    this.textareas = [];
    this.labels = [];
    this.sectionBlocks = [];
    this.audios = [];
    this.preTestCard = new Element(null, 'section');
    this.documentElement = { outerHTML: '<html></html>' };

    ['studentName', 'studentClass', 'studentDate', 'startBtn', 'timerWidget', 'timerDisplay', 'scoreSummary', 'scoreDisplay', 'scoreDetail', 'pageNav', 'prevPageBtn', 'nextPageBtn', 'pageIndicator']
      .concat(config.ids || [])
      .forEach(id => this.addElement(id, ['timerDisplay', 'scoreDisplay', 'scoreDetail', 'pageIndicator'].includes(id) ? 'div' : 'input'));

    this.byId.get('timerWidget').style.display = 'none';
    this.byId.get('scoreSummary').style.display = 'none';
    this.byId.get('pageNav').style.display = 'none';

    for (let i = 0; i < (config.sectionCount || 3); i += 1) {
      const block = new Element(null, 'section');
      block.style.display = 'none';
      block.classList.add('section-block');
      this.sectionBlocks.push(block);
    }

    (config.textareas || []).forEach(id => this.addElement(id, 'textarea'));

    Object.entries(config.radios || {}).forEach(([name, values]) => {
      values.forEach(value => {
        const input = new Element(null, 'input');
        input.type = 'radio';
        input.name = name;
        input.value = value;
        const label = new LabelElement(input);
        label.classList.add('choice-label');
        this.inputs.push(input);
        this.labels.push(label);
      });
    });

    (config.audio || []).forEach(expected => {
      const missing = new Element(null, 'div');
      missing.classList.add('missing-audio');
      missing.style.display = 'none';
      const wrap = new AudioWrap(missing);
      const audio = new AudioElement(expected);
      audio.parentElement = wrap;
      this.audios.push(audio);
    });
  }

  addElement(id, tagName) {
    if (this.byId.has(id)) return this.byId.get(id);
    const el = new Element(id, tagName);
    if (tagName === 'textarea') this.textareas.push(el);
    if (tagName === 'input') this.inputs.push(el);
    this.byId.set(id, el);
    return el;
  }

  getElementById(id) {
    return this.byId.get(id) || null;
  }

  createElement(tagName) {
    return new Element(null, tagName);
  }

  querySelector(selector) {
    if (selector === '.pre-test-card') return this.preTestCard;
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  querySelectorAll(selector) {
    if (selector === '.section-block') return this.sectionBlocks;
    if (selector === '.choice-label') return this.labels;
    if (selector === 'input') return this.inputs;
    if (selector === 'textarea') return this.textareas;
    if (selector === 'input, textarea') return [...this.inputs, ...this.textareas];
    if (selector === 'audio[data-expected]') return this.audios;
    const checkedMatch = selector.match(/^input\[name="([^"]+)"\]:checked$/);
    if (checkedMatch) return this.inputs.filter(input => input.name === checkedMatch[1] && input.checked);
    const nameMatch = selector.match(/^input\[name="([^"]+)"\]$/);
    if (nameMatch) return this.inputs.filter(input => input.name === nameMatch[1]);
    const nameValueMatch = selector.match(/^input\[name="([^"]+)"\]\[value="([^"]+)"\]$/);
    if (nameValueMatch) return this.inputs.filter(input => input.name === nameValueMatch[1] && input.value === nameValueMatch[2]);
    return [];
  }
}

function extractScript(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert(matches.length > 0, `No script found in ${filePath}`);
  return matches[matches.length - 1][1];
}

function createContext(config, seedStorage = {}) {
  const document = new DocumentMock(config);
  const sessionStorage = new SessionStorageMock(seedStorage);
  const alerts = [];
  const location = {
    search: config.search || '',
    pathname: '/' + (config.fileName || 'test.html'),
    href: '',
    reload() {}
  };
  const context = {
    document,
    sessionStorage,
    alert: msg => alerts.push(String(msg)),
    confirm: () => true,
    location,
    window: { print() {}, scrollTo() {} },
    URL: { createObjectURL: () => 'blob:mock' },
    URLSearchParams,
    Blob: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
    MediaRecorder: class {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
  };
  context.global = context;
  context.globalThis = context;
  context.__alerts = alerts;
  return { context: vm.createContext(context), document, sessionStorage, alerts };
}

function evalExpr(ctx, expr) {
  return vm.runInContext(expr, ctx);
}

function loadPage(fileName, config, seedStorage = {}) {
  const filePath = path.join(BASE_DIR, fileName);
  const script = extractScript(filePath);
  const env = createContext({ ...config, fileName }, seedStorage);
  vm.runInContext(script, env.context);
  return { ...env, filePath };
}

async function verifyAssets() {
  const assets = [
    'section1_speaking.html',
    'section2_listening.html',
    'section3_language.html',
    'section4_reading.html',
    'section5_writing.html',
    'generated_images/speaking-family-breakfast.png',
    'generated_images/speaking-plant-sequence.png',
    'generated_images/listening-q1-picture-set.png',
    'generated_images/language-orange-notebook-car.png',
    'generated_images/reading-boy-taking-photo.png',
    'generated_images/writing-park-scene.png',
    'audio/listening_q1.mp3',
    'audio/listening_q2.mp3',
    'audio/listening_q3.mp3',
    'audio/listening_q4.mp3',
    'audio/listening_q5.mp3',
    'audio/listening_q6.mp3',
    'audio/listening_q7.mp3',
    'audio/listening_q8.mp3',
    'audio/listening_q9.mp3',
    'audio/listening_q10.mp3',
    'audio/writing_q1.mp3',
    'audio/writing_q2.mp3',
    'audio/writing_q3.mp3',
  ];

  for (const asset of assets) {
    const assetPath = path.join(BASE_DIR, asset);
    assert(fs.existsSync(assetPath), `Missing asset: ${asset}`);
    assert(fs.statSync(assetPath).size > 0, `Empty asset: ${asset}`);
  }
}

async function verifyListening() {
  const page = loadPage('section2_listening.html', {
    sectionCount: 3,
    radios: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, ['A', 'B', 'C']])),
    audio: Array.from({ length: 10 }, (_, i) => `audio/listening_q${i + 1}.mp3`)
  });
  evalExpr(page.context, "document.getElementById('studentName').value='Tester'; startTimer();");
  evalExpr(page.context, `
    Q_NAMES.forEach(q => {
      document.querySelector('input[name=\"' + q + '\"][value=\"' + ANSWER_KEY[q] + '\"]').checked = true;
    });
    syncChoiceStyles();
    scheduleAutosave();
  `);
  await sleep(1300);
  const storageKey = evalExpr(page.context, 'STORAGE_KEY');
  const saved = JSON.parse(page.sessionStorage.getItem(storageKey));
  assert(saved.meta.studentName === 'Tester', 'Listening autosave missed student name');
  assert(saved.answers.q10 === 'A', 'Listening autosave missed answers');
  assert(saved.currentPage === 0, 'Listening did not start on page 1');
  evalExpr(page.context, 'submitTest();');
  assert(page.document.getElementById('scoreDisplay').textContent === '10 / 10', 'Listening score display incorrect');
  assert(page.document.getElementById('scoreSummary').style.display === 'block', 'Listening summary did not show');
}

async function verifyLanguage() {
  const page = loadPage('section3_language.html', {
    sectionCount: 3,
    radios: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`q${i + 1}`, ['A', 'B', 'C']]))
  });
  evalExpr(page.context, "document.getElementById('studentName').value='Tester'; startTimer();");
  evalExpr(page.context, `
    Q_NAMES.forEach(q => {
      document.querySelector('input[name=\"' + q + '\"][value=\"' + ANSWER_KEY[q] + '\"]').checked = true;
    });
    syncChoiceStyles();
    submitTest();
  `);
  assert(page.document.getElementById('scoreDisplay').textContent === '12 / 12', 'Language score display incorrect');
}

async function verifyReading() {
  const page = loadPage('section4_reading.html', {
    sectionCount: 3,
    radios: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, ['A', 'B', 'C']]))
  });
  evalExpr(page.context, "document.getElementById('studentName').value='Tester'; startTimer();");
  evalExpr(page.context, `
    Q_NAMES.forEach(q => {
      document.querySelector('input[name=\"' + q + '\"][value=\"' + ANSWER_KEY[q] + '\"]').checked = true;
    });
    syncChoiceStyles();
    submitTest();
  `);
  assert(page.document.getElementById('scoreDisplay').textContent === '10 / 10', 'Reading score display incorrect');
}

async function verifyWriting() {
  const ids = ['wq1', 'wq2a', 'wq2b', 'wq3', 'part2_1', 'part2_2', 'part2_3', 'part2_4', 'part2_5', 'spelling', 'grammar', 'content', 'handwriting', 'teacherNotes'];
  const textareas = ['pictureWriting', 'sentenceSupport'];
  const page = loadPage('section5_writing.html', {
    sectionCount: 4,
    ids,
    textareas,
    audio: ['audio/writing_q1.mp3', 'audio/writing_q2.mp3', 'audio/writing_q3.mp3']
  });
  evalExpr(page.context, `
    document.getElementById('studentName').value='Tester';
    document.getElementById('wq1').value='watching';
    document.getElementById('wq2a').value='tonight';
    document.getElementById('wq2b').value='brother';
    document.getElementById('wq3').value='so we will have a party';
    document.getElementById('part2_1').value='teacher';
    document.getElementById('part2_2').value='soccer';
    document.getElementById('part2_3').value='cousin';
    document.getElementById('part2_4').value='happy';
    document.getElementById('part2_5').value='library';
    document.getElementById('pictureWriting').value='Two children are playing in the park.';
    startTimer();
    scheduleAutosave();
  `);
  await sleep(1300);
  evalExpr(page.context, 'submitTest();');
  assert(page.document.getElementById('scoreDisplay').textContent === '9 / 9', 'Writing score display incorrect');
  const storageKey = evalExpr(page.context, 'STORAGE_KEY');
  const saved = JSON.parse(page.sessionStorage.getItem(storageKey));
  assert(saved.values.pictureWriting.includes('park'), 'Writing autosave missed paragraph');
  assert(saved.scoreVisible === true, 'Writing saved state missed visible score');
  assert(saved.currentPage === 0, 'Writing did not open on first booklet page');
  assert(page.context.location.href.includes('?mode=test'), 'Writing start did not switch to test view');

  const restored = loadPage('section5_writing.html', {
    sectionCount: 4,
    search: '?mode=test',
    ids,
    textareas,
    audio: ['audio/writing_q1.mp3', 'audio/writing_q2.mp3', 'audio/writing_q3.mp3']
  }, { [storageKey]: page.sessionStorage.getItem(storageKey) });
  assert(restored.document.getElementById('wq1').value === 'watching', 'Writing restore missed answer');
  assert(restored.document.getElementById('scoreDisplay').textContent === '9 / 9', 'Writing restore missed score');
}

async function verifySpeaking() {
  const page = loadPage('section1_speaking.html', {
    sectionCount: 4,
    ids: ['task1notes', 'task2notes', 'task3notes', 'pronunciation', 'fluency', 'vocabulary', 'taskCompletion', 'teacherNotes']
  });
  evalExpr(page.context, `
    document.getElementById('studentName').value='Tester';
    document.getElementById('task1notes').value='Breakfast vocabulary used.';
    startTimer();
    scheduleAutosave();
  `);
  await sleep(1300);
  const storageKey = evalExpr(page.context, 'STORAGE_KEY');
  const saved = JSON.parse(page.sessionStorage.getItem(storageKey));
  assert(saved.values.task1notes.includes('Breakfast'), 'Speaking autosave missed notes');
  assert(saved.currentPage === 0, 'Speaking did not start on first booklet page');
  assert(page.context.location.href.includes('?mode=test'), 'Speaking start did not switch to test view');

  const restored = loadPage('section1_speaking.html', {
    sectionCount: 4,
    search: '?mode=test',
    ids: ['task1notes', 'task2notes', 'task3notes', 'pronunciation', 'fluency', 'vocabulary', 'taskCompletion', 'teacherNotes']
  }, { [storageKey]: page.sessionStorage.getItem(storageKey) });
  assert(restored.document.getElementById('studentName').value === 'Tester', 'Speaking restore missed name');
  assert(restored.document.getElementById('task1notes').value.includes('Breakfast'), 'Speaking restore missed notes');
}

async function main() {
  await verifyAssets();
  await verifyListening();
  await verifyLanguage();
  await verifyReading();
  await verifyWriting();
  await verifySpeaking();
  console.log('All Step 1 package checks passed.');
}

main().catch(err => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
