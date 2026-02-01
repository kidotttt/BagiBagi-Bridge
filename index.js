const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// CONFIG
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const MERCHANT_CODE = process.env.MERCHANT_CODE;
const API_KEY = process.env.API_KEY;
const TOPIC_NAME = "BagiBagiDonation";

app.post('/webhook', async (req, res) => {
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;
    await axios.post(url, { message: JSON.stringify(req.body) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' }
    });
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.get('/leaderboard', async (req, res) => {
  if (!MERCHANT_CODE || !API_KEY || MERCHANT_CODE === 'undefined') {
    return res.status(400).json({ error: "Missing Variables! Silakan isi MERCHANT_CODE dan API_KEY di Tab Variables Railway." });
  }

  const limit = req.query.limit || 15;
  const url = `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    res.status(200).json(response.data);
  } catch (err) {
    console.error('❌ BagiBagi Rejection:', err.response?.data || err.message);
    res.status(400).json({ error: "BagiBagi rejected", detail: err.message });
  }
});

app.get('/', (req, res) => res.send('Bridge is Active!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Listening on port ${PORT}`));
