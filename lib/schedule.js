const data = require('../data/schedule.json');
const { GROUP, LESSON_TIMES } = require('../config');
const { getBlocks } = require('./sheet');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_MS = 864e5;

function utcDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function weekInfo(date) {
  const dow = date.getUTCDay();
  const monday = new Date(date.getTime() - ((dow + 6) % 7) * DAY_MS);
  const weeks = Math.round((monday - utcDate(data.referenceWeek2Start)) / (7 * DAY_MS));
  return { week: Math.abs(weeks % 2) === 0 ? 2 : 1, dayKey: DAYS[dow] };
}

function mainPart(week, dayKey, lesson, sub) {
  const node = data.weeks?.[week]?.[dayKey]?.[lesson];
  if (!node) return null;
  const part = Object.prototype.hasOwnProperty.call(node, sub) ? node[sub] : node.all;
  return part ?? null;
}

function mainCard(week, dayKey, lesson, sub, status = 'main') {
  const p = mainPart(week, dayKey, lesson, sub);
  if (!p) return { status: 'free' };
  return { status, subject: p.subject, type: p.type, teacher: p.teacher, room: p.room };
}

function resolve(entries, sub, hour) {
  const forSub = entries.filter(e => e.sub === null || e.sub === sub);
  const relevant = forSub.filter(e => e.hour === null || e.hour === hour);
  if (relevant.length) {
    relevant.sort((a, b) => (b.sub !== null) - (a.sub !== null) || (b.hour !== null) - (a.hour !== null));
    return relevant[0];
  }
  if (forSub.some(e => e.hour !== null)) return { kind: 'absent' };
  return { kind: 'main' };
}

function buildCard(week, dayKey, lesson, sub, hour, entries) {
  if (!entries) return mainCard(week, dayKey, lesson, sub);
  const r = resolve(entries, sub, hour);
  if (r.kind === 'main') return mainCard(week, dayKey, lesson, sub);
  if (r.kind === 'absent') return { status: 'absent' };
  if (r.kind === 'cancel') return mainCard(week, dayKey, lesson, sub, 'cancel');
  return {
    status: 'change',
    subject: r.subject,
    type: null,
    teacher: null,
    room: r.room
  };
}

function buildLesson(n, week, dayKey, groupPairs) {
  const pair = Math.ceil(n / 2);
  const hour = ((n - 1) % 2) + 1;
  const entries = groupPairs && groupPairs[pair] ? groupPairs[pair] : null;
  const subgroups = {};
  for (const sub of [1, 2]) {
    subgroups[sub] = buildCard(week, dayKey, n, sub, hour, entries);
  }
  return { n, time: LESSON_TIMES[n - 1] || '', subgroups };
}

async function getDaySchedule(dateStr) {
  const date = utcDate(dateStr);
  const { week, dayKey } = weekInfo(date);

  if (dayKey === 'sunday') {
    return { date: dateStr, weekday: dayKey, week, source: 'main', lessons: [] };
  }

  let blocks = null;
  let sheetError = false;
  try {
    blocks = await getBlocks();
  } catch {
    sheetError = true;
  }

  const [y, m, d] = dateStr.split('-');
  const block = blocks ? blocks[`${d}.${m}.${y}`] : null;
  const groupPairs =
    block && block.groups[GROUP] && (block.week === null || block.week === week)
      ? block.groups[GROUP]
      : null;

  const lessons = [1, 2, 3, 4, 5, 6, 7, 8].map(n => buildLesson(n, week, dayKey, groupPairs));

  return {
    date: dateStr,
    weekday: dayKey,
    week,
    source: groupPairs ? 'changes' : 'main',
    sheetError,
    lessons
  };
}

module.exports = { getDaySchedule };