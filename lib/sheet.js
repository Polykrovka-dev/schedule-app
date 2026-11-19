const axios = require('axios');
const { SHEET_CSV_URL, CACHE_MS, GROUP } = require('../config');

const DATE_RE = /(\d{2}\.\d{2}\.\d{4})/;
const WEEK_RE = /([12])\s*неделя/i;
const GROUP_RE = /^\d[А-ЯЁA-Z]\d{3}$/;

let cache = { at: 0, data: null };

function clean(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function splitLines(s) {
  return (s || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseLine(line, room) {
  const m = line.match(/^(?:([12])ч)?\s*(?:([123])п)?\s*(.*)$/i);
  const hour = m[1] ? Number(m[1]) : null;
  const sub = m[2] ? Number(m[2]) : null;
  const rest = (m[3] || '').trim();
  let kind = 'main';
  if (rest === '-') kind = 'cancel';
  else if (rest && rest !== '+') kind = 'change';
  return { hour, sub, kind, subject: kind === 'change' ? rest : null, room: clean(room) };
}

function parseRows(rows) {
  const blocks = {};
  let date = null;

  for (const raw of rows) {
    const texts = raw.map(clean);

    const dateHit = texts.map(t => DATE_RE.exec(t)).find(Boolean);
    if (dateHit) {
      date = dateHit[1];
      const w = WEEK_RE.exec(texts[0] || '');
      blocks[date] = blocks[date] || { week: w ? Number(w[1]) : null, groups: {} };
    }
    if (!date) continue;

    const name = (texts[0] || '').replace(/\s+/g, '').toUpperCase();
    if (!GROUP_RE.test(name)) continue;

    const pairs = {};
    for (let p = 1; p <= 5; p++) {
      const subjLines = splitLines(raw[2 * p - 1]);
      const roomLines = splitLines(raw[2 * p]);
      pairs[p] = subjLines.map((l, i) => parseLine(l, roomLines[i]));
    }
    blocks[date].groups[name] = pairs;
  }

  return blocks;
}

async function getBlocks() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const { data } = await axios.get(SHEET_CSV_URL, {
      timeout: 15000,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    cache = { at: Date.now(), data: parseRows(parseCsv(data)) };
    return cache.data;
  } catch (err) {
    if (cache.data) return cache.data;
    throw err;
  }
}

module.exports = { getBlocks };