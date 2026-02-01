const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// CONFIG
const MERCHANT_CODE = process.env.MERCHANT_CODE;
const API_KEY = process.env.API_KEY;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;

app.get('/', (req, res) => {
  // Halaman ini buat ngecek apakah Variables sudah masuk atau belum
  res.send(`
        <h1>Bridge Status: ACTIVE</h1>
        <p>Merchant Code: ${MERCHANT_CODE ? '✅ LOADED' : '❌ MISSING'}</p>
        <p>API Key: ${API_KEY ? '✅ LOADED' : '❌ MISSING'}</p>
        <p>Universe ID: ${UNIVERSE_ID ? '✅ LOADED' : '❌ MISSING'}</p>
        <p>Roblox Key: ${ROBLOX_API_KEY ? '✅ LOADED' : '❌ MISSING'}</p>
        <hr>
        <p>Kalau ada yang ❌ MISSING, silakan isi di Tab Variables Railway kamu!</p>
    `);
});

app.get('/leaderboard', async (req, res) => {
  if (!MERCHANT_CODE || MERCHANT_CODE === 'undefined') {
    return res.status(400).json({ error: "Variables belum diisi di Railway!" });
  }
  const limit = req.query.limit || 15;
  const url = `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`;
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Roblox/1.0' } });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(400).json({ error: "BagiBagi Rejected", detail: err.message });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/BagiBagiDonation`;
    await axios.post(url, { message: JSON.stringify(req.body) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' }
    });
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Listening on port ${PORT}`));
