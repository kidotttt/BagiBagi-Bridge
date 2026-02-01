const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CONFIG (Diambil dari Railway Environment Variables)
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const MERCHANT_CODE = process.env.MERCHANT_CODE;
const API_KEY = process.env.API_KEY;
const TOPIC_NAME = "BagiBagiDonation";

// ==========================================
// 1. WEBHOOK RECEIVER (Dari BagiBagi Dashboard)
// ==========================================
app.post('/webhook', async (req, res) => {
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;

    await axios.post(url, {
      message: JSON.stringify(req.body)
    }, {
      headers: {
        'x-api-key': ROBLOX_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Forwarded to Roblox via MessagingService');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error forwarding to Roblox:', err.response?.data || err.message);
    res.status(500).send('Error');
  }
});

// ==========================================
// 2. LEADERBOARD PROXY (Auto-Retry Strategy)
// ==========================================
app.get('/leaderboard', async (req, res) => {
  const limit = req.query.limit || 15;

  // Mencoba 2 variasi parameter yang sering digunakan API BagiBagi
  const urls = [
    `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`,
    `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&secretKey=${API_KEY}&limit=${limit}`
  ];

  let lastError = "";

  for (let url of urls) {
    try {
      console.log(`[Bridge] Attempting fetch: ${url.split('?')[0]}`);
      const response = await axios.get(url, { timeout: 7000 });

      if (response.data) {
        console.log(`✅ Success fetching leaderboard using format: ${url.includes('apiKey') ? 'apiKey' : 'secretKey'}`);
        return res.status(200).json(response.data);
      }
    } catch (err) {
      lastError = err.message;
      console.warn(`[Bridge] Failed attempt: ${err.message}`);
    }
  }

  res.status(400).json({
    error: "All API formats failed",
    detail: lastError,
    message: "Check your MERCHANT_CODE and API_KEY in Railway Variables!"
  });
});

// Root Route
app.get('/', (req, res) => res.send('BagiBagi Webhook Bridge is Active!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Listening on port ${PORT}`));
