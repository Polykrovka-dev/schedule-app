const axios = require('axios');
const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgODzWJhSfml2SVezD2P4wdEyp92gZ7y3-tyjFssLI80j3CCTv7-cmJhcCsvQNKcPnzP-m2r9pswd8';

(async () => {
  const { data } = await axios.get(`${BASE}/pub?gid=0&single=true&output=csv`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    responseType: 'text'
  });
  console.log('длина:', data.length);
  console.log('есть 2П065:', data.includes('2П065'));
  console.log('есть 19.11.2026:', data.includes('19.11.2026'));
  console.log('начало:', data.slice(0, 300));
})().catch(e => console.log('ошибка:', e.message));