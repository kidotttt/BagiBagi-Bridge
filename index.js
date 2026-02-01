const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// CONFIG
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const MERCHANT_CODE = process.env.MERCHANT_CODE;
const API_KEY = process.env.API_KEY;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN; // Optional: Token dari dashboard BagiBagi
const TOPIC_NAME = "BagiBagiDonation";

// Helper: Validasi Signature (Jika kamu set token di dashboard)
function isValidSignature(body, signature) {
  if (!signature || !WEBHOOK_TOKEN) return true; // Skip if no token set
  const gen = crypto.createHmac('sha256', WEBHOOK_TOKEN).update(JSON.stringify(body)).digest('hex');
  return gen === signature;
}

// 1. WEBHOOK RECEIVER (Donasi dari BagiBagi -> Roblox)
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-signature'] || req.headers['signature'];

  if (WEBHOOK_TOKEN && !isValidSignature(req.body, signature)) {
    console.warn('⚠️ Invalid Webhook Signature');
    return res.status(401).send('Unauthorized');
  }

  console.log('--- Donation Received ---');
  console.log('Donor:', req.body.name);

  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC_NAME}`;
    await axios.post(url, { message: JSON.stringify(req.body) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' }
    });
    console.log('✅ Forwarded to Roblox!');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Roblox Error:', err.message);
    res.status(500).send('Bridge Error');
  }
});

// 2. LEADERBOARD PROXY (BagiBagi -> Railway -> Roblox)
app.get('/leaderboard', async (req, res) => {
  const limit = req.query.limit || 15;

  // Kita coba fetch dengan header dan query sekaligus agar lebih kompatibel
  const url = `https://bagibagi.co/api/partnerintegration/top-donator?merchantCode=${MERCHANT_CODE}&apiKey=${API_KEY}&limit=${limit}`;

  try {
    console.log('[Bridge] Fetching Leaderboard...');
    const response = await axios.get(url, {
      headers: { 'x-api-key': API_KEY }
    });

    console.log('✅ Leaderboard Fetched!');
    res.status(200).json(response.data);
  } catch (err) {
    const detail = err.response ? err.response.data : err.message;
    console.error('❌ BagiBagi Error:', detail);
    res.status(400).json({ error: "BagiBagi rejected", detail: detail });
  }
});

app.get('/', (req, res) => res.send('BagiBagi-Roblox Bridge is Active!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Bridge] Listening on port ${PORT}`));
