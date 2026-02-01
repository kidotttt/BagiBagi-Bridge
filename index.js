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
  res.send('<h1>Bridge ACTIVE</h1><p>Status: All Variables Loaded ✅</p>');
});

app.get('/leaderboard', async (req, res) => {
  if (!MERCHANT_CODE || MERCHANT_CODE === 'undefined') {
    return res.status(400).json({ error: "Variables belum diisi di Railway!" });
  }
  const limit = req.query.limit || 15;

  // Mencoba berbagai variasi parameter yang didukung BagiBagi
  const testUrls = [
    `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`,
    `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&secretKey=${API_KEY}&limit=${limit}`
  ];

  for (let url of testUrls) {
    try {
      console.log(`[Bridge] Trying fetch...`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });

      if (response.data) {
        console.log(`✅ Success fetching leaderboard!`);
        return res.status(200).json(response.data);
      }
    } catch (err) {
      console.warn(`⚠️ Attempt failed: ${err.message}`);
    }
  }

  res.status(400).json({ error: "BagiBagi rejected all formats" });
});

app.post('/webhook', async (req, res) => {
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/BagiBagiDonation`;
    await axios.post(url, { message: JSON.stringify(req.body) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' }
    });
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Roblox Error:', err.message);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Active on port ${PORT}`));
