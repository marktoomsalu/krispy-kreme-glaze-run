import { CFG } from './config.js';
import { state } from './state.js';
import {
  fetchTop,
  fetchTopWeekly,
  getNickname,
  saveNickname,
  submitClaimContact,
  hasSeenTutorial,
  markTutorialSeen
} from './leaderboard.js';

const TIER_COPY = {
  discount: { win: '5% allahindluse', noun: '5% allahindlus' },
  free_donut: { win: 'tasuta sõõriku', noun: 'tasuta sõõrik' }
};

let lastHandledKey = null;
let currentView = 'week'; // 'week' | 'alltime' — which tab the leaderboard panel shows

export function initUI() {
  const refs = {
    nickPrompt: document.getElementById('nickname-prompt'),
    nickInput: document.getElementById('nickname-input'),
    nickSave: document.getElementById('nickname-save'),
    lbPanel: document.getElementById('leaderboard-panel'),
    lbResult: document.getElementById('leaderboard-result'),
    lbList: document.getElementById('leaderboard-list'),
    lbClose: document.getElementById('leaderboard-close'),
    lbOpen: document.getElementById('leaderboard-open'),
    lbTeaser: document.getElementById('leaderboard-teaser'),
    lbTabWeek: document.getElementById('lb-tab-week'),
    lbTabAlltime: document.getElementById('lb-tab-alltime')
  };

  if (!hasSeenTutorial()) {
    refs.nickInput.value = getNickname(); // don't make a returning player retype it
    refs.nickPrompt.classList.remove('hidden');
  }

  refs.nickSave.addEventListener('click', () => saveNicknameFromInput(refs));
  refs.nickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNicknameFromInput(refs);
  });

  refs.lbClose.addEventListener('click', () => refs.lbPanel.classList.add('hidden'));
  refs.lbOpen.addEventListener('click', async () => {
    refs.lbResult.textContent = '';
    refs.lbPanel.classList.remove('hidden');
    await renderList(refs.lbList, currentView);
  });

  refs.lbTabWeek.addEventListener('click', () => switchView('week', refs));
  refs.lbTabAlltime.addEventListener('click', () => switchView('alltime', refs));

  renderTeaser(refs.lbTeaser);

  const poll = () => {
    tick(refs);
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

async function switchView(view, refs) {
  if (view === currentView) return;
  currentView = view;
  refs.lbTabWeek.classList.toggle('active', view === 'week');
  refs.lbTabAlltime.classList.toggle('active', view === 'alltime');
  await renderList(refs.lbList, currentView);
}

function saveNicknameFromInput({ nickInput, nickPrompt }) {
  const name = nickInput.value.trim();
  if (!name) return;
  saveNickname(name);
  markTutorialSeen();
  nickPrompt.classList.add('hidden');
}

function tick(refs) {
  const result = state.lastResult;
  const key = result ? `${state.runSeq}:${result.status}` : null;
  if (!key || key === lastHandledKey) return;
  if (result.status !== 'accepted') return; // rejected/error fail quietly, never interrupt restarting
  lastHandledKey = key;
  showResult(result, refs);
}

async function showResult(result, refs) {
  renderResultBlock(refs.lbResult, result);
  refs.lbPanel.classList.remove('hidden');
  await renderList(refs.lbList, currentView);
}

function renderResultBlock(el, result) {
  el.textContent = '';
  addLine(el, `Sinu tulemus: ${result.score} · koht #${result.rank}`);
  if (result.weeklyRank) addLine(el, `Sel nädalal: koht #${result.weeklyRank}`, 'nudge');

  if (result.tier) {
    const copy = TIER_COPY[result.tier];
    if (result.isNewBest) {
      addLine(el, `Sa võitsid ${copy.win}! Kood: ${result.claimCode}`, 'win');
    } else {
      addLine(el, `Sinu varasem võit: ${copy.noun}. Kood: ${result.claimCode}`, 'win');
    }
    renderContactForm(el, result.claimCode);
  } else {
    const toDiscount = CFG.rewards.discountScore - result.score;
    const toDonut = CFG.rewards.freeDonutScore - result.score;
    if (toDiscount > 0) addLine(el, `Vajaka jäi ${toDiscount} punktist allahindluseni!`, 'nudge');
    else if (toDonut > 0) addLine(el, `Vajaka jäi ${toDonut} punktist tasuta sõõrikuni!`, 'nudge');
  }
}

function renderContactForm(el, claimCode) {
  if (getContactGiven(claimCode)) {
    addLine(el, 'Aitäh! Võtame varsti ühendust.', 'nudge');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'contact-form';

  const label = document.createElement('label');
  label.textContent = 'Jäta e-post või telefon, et saaksime auhinna kätte anda';

  const input = document.createElement('input');
  input.placeholder = 'nimi@näide.ee';
  input.maxLength = 200;

  const btn = document.createElement('button');
  btn.textContent = 'Saada';

  const submit = async () => {
    const value = input.value.trim();
    if (!value) return;
    btn.disabled = true;
    const ok = await submitClaimContact(claimCode, value);
    if (ok) {
      setContactGiven(claimCode);
      wrap.remove();
      addLine(el, 'Aitäh! Võtame varsti ühendust.', 'nudge');
    } else {
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  wrap.append(label, input, btn);
  el.appendChild(wrap);
}

function getContactGiven(code) {
  try {
    return localStorage.getItem(`glaze-runner:contactGiven:${code}`) === '1';
  } catch {
    return false;
  }
}

function setContactGiven(code) {
  try {
    localStorage.setItem(`glaze-runner:contactGiven:${code}`, '1');
  } catch {
    /* ignore */
  }
}

function addLine(el, text, className) {
  const p = document.createElement('p');
  p.textContent = text;
  if (className) p.className = className;
  el.appendChild(p);
}

async function renderList(listEl, view) {
  const rows = view === 'alltime' ? await fetchTop(10) : await fetchTopWeekly(10);
  listEl.textContent = '';

  if (!rows.length) {
    const li = document.createElement('li');
    li.textContent =
      view === 'alltime'
        ? 'Edetabel on veel tühi — ole esimene!'
        : 'Selle nädala edetabel on veel tühi — ole esimene!';
    listEl.appendChild(li);
    return;
  }

  rows.forEach((row, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${row.nickname} — ${row.score}`;
    if (row.tier) li.className = `tier-${row.tier}`;
    listEl.appendChild(li);
  });
}

async function renderTeaser(el) {
  if (!el) return;
  const rows = await fetchTopWeekly(1);
  el.textContent = rows.length
    ? `Selle nädala liider: ${rows[0].nickname} — ${rows[0].score} punkti`
    : 'Ole selle nädala esimene liider!';
}
