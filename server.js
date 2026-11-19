const express = require('express');
const path = require('path');
const { PORT } = require('./config');
const { getDaySchedule } = require('./lib/schedule');

const app = express();

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: res => res.set('Cache-Control', 'no-cache')
}));

app.get('/api/schedule', async (req, res) => {
  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'bad date' });
  }
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getDaySchedule(date));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));