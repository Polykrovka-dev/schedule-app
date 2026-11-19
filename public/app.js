const state = { day: 'today', sub: localStorage.getItem('sub') || '2' };
let last = null;

const WEEKDAYS = {
  monday: 'понедельник', tuesday: 'вторник', wednesday: 'среда',
  thursday: 'четверг', friday: 'пятница', saturday: 'суббота', sunday: 'воскресенье'
};
const STATUS = { change: 'Замена', cancel: 'Отмена', absent: 'Часа нет' };

const $ = s => document.querySelector(s);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function dateFor(day) {
  const d = new Date();
  if (day === 'tomorrow') d.setDate(d.getDate() + 1);
  return d;
}

function iso(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function roomText(r) {
  if (!r || r === '-') return '';
  if (r === 'с/з') return 'Спортзал';
  return 'каб. ' + r;
}

function card(c, label) {
  const box = el('div', 'card ' + c.status);
  const head = el('div', 'head');
  head.append(el('span', null, label || ''));
  if (STATUS[c.status]) head.append(el('span', 'badge', STATUS[c.status]));
  box.append(head);

  if (c.status === 'absent') {
    box.append(el('div', 'subj muted', 'Часа нет'));
    return box;
  }

  box.append(el('div', 'subj', c.subject || '—'));
  const meta = [c.type, c.teacher].filter(Boolean).join(' · ');
  if (meta) box.append(el('div', 'meta', meta));
  const room = roomText(c.room);
  if (room) box.append(el('div', 'room', room));
  return box;
}

function render() {
  const list = $('#list');
  list.innerHTML = '';
  if (!last) return;

  const d = new Date(last.date + 'T12:00:00');
  $('#date').textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) +
    ' · ' + (WEEKDAYS[last.weekday] || '');
  $('#week').textContent = last.week ? `${last.week} неделя` : '';
  $('#note').textContent = last.source === 'changes'
    ? 'Учтены замены'
    : 'По основному расписанию';

  if (last.weekday === 'sunday' || !last.lessons.length) {
    list.append(el('div', 'empty', 'Занятий нет'));
    return;
  }

  const subs = state.sub === 'all' ? [1, 2] : [Number(state.sub)];
  let shown = 0;

  for (const lesson of last.lessons) {
    const items = [];
    for (const s of subs) {
      const c = lesson.subgroups[s];
      if (c && c.status !== 'free') {
        items.push({ c, label: subs.length > 1 ? `${s} подгруппа` : '' });
      }
    }
    if (!items.length) continue;

    shown++;
    const wrap = el('section', 'lesson');
    const head = `Урок ${lesson.n}` + (lesson.time ? ` · ${lesson.time}` : '');
    wrap.append(el('div', 'lhead', head));
    for (const { c, label } of items) wrap.append(card(c, label));
    list.append(wrap);
  }

  if (!shown) list.append(el('div', 'empty', 'Занятий нет'));
}

async function load() {
  const d = dateFor(state.day);
  try {
    const res = await fetch(`/api/schedule?date=${iso(d)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('сервер ответил ' + res.status);
    last = await res.json();
    render();
  } catch (e) {
    $('#note').textContent = 'Ошибка: ' + e.message;
  }
}

function mark() {
  document.querySelectorAll('#day button').forEach(b =>
    b.classList.toggle('on', b.dataset.v === state.day));
  document.querySelectorAll('#sub button').forEach(b =>
    b.classList.toggle('on', b.dataset.v === state.sub));
}

document.querySelectorAll('#day button').forEach(b =>
  b.addEventListener('click', () => {
    state.day = b.dataset.v;
    mark();
    load();
  }));

document.querySelectorAll('#sub button').forEach(b =>
  b.addEventListener('click', () => {
    state.sub = b.dataset.v;
    localStorage.setItem('sub', state.sub);
    mark();
    render();
  }));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) load();
});

mark();
load();
setInterval(load, 5 * 60 * 1000);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}