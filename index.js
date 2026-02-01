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
  const donationData = req.body;
  console.log('--- Donation Received ---');
  console.log('Donor:', donationData.name || 'Anonymous');
  console.log('Amount:', donationData.amount);

  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;

    await axios.post(url, {
      message: JSON.stringify(donationData)
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
// 2. LEADERBOARD PROXY (Untuk Board di Game)
// ==========================================
app.get('/leaderboard', async (req, res) => {
  const limit = req.query.limit || 15;

  // Request ke API Asli BagiBagi (Railway punya IP Bersih)
  const url = `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`;

  try {
    const response = await axios.get(url);
    console.log('✅ Leaderboard data fetched from BagiBagi');
    res.status(200).json(response.data);
  } catch (err) {
    console.error('❌ Leaderboard Fetch Error:', err.message);
    res.status(400).json({ error: "Failed to fetch leaderboard data" });
  }
});

// Root Route
app.get('/', (req, res) => res.send('BagiBagi Webhook Bridge is Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Listening on port ${PORT}`));
