// ============================================
// WEBHOOK BRIDGE SERVER
// Menghubungkan BagiBagi dengan Roblox
// ============================================

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== KONFIGURASI ======
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'DEV_TOKEN_CHANGE_ME';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Storage untuk donasi terakhir (in-memory)
let lastDonation = null;
let donationHistory = []; // Opsional: simpan beberapa donasi terakhir
const MAX_HISTORY = 10;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ====== FUNGSI HELPER ======

/**
 * Validasi signature webhook menggunakan HMAC SHA256
 * Ini untuk memastikan request benar-benar dari BagiBagi
 */
function isValidSignature(body, webhookToken, signature) {
  if (!signature || !webhookToken) return false;

  // Generate signature dari body
  const generatedSignature = crypto
    .createHmac('sha256', webhookToken)
    .update(JSON.stringify(body))
    .digest('hex');

  // Convert ke buffer untuk timing-safe comparison
  const sigBuf = Buffer.from(signature, 'hex');
  const genBuf = Buffer.from(generatedSignature, 'hex');

  // Cek panjang dulu
  if (sigBuf.length !== genBuf.length) return false;

  // Timing-safe comparison (prevent timing attacks)
  return crypto.timingSafeEqual(sigBuf, genBuf);
}

/**
 * Simpan donasi ke history
 */
function saveDonation(donation) {
  lastDonation = donation;
  
  // Tambah ke history
  donationHistory.unshift(donation);
  
  // Limit history size
  if (donationHistory.length > MAX_HISTORY) {
    donationHistory = donationHistory.slice(0, MAX_HISTORY);
  }
  
  console.log('💜 Donasi baru disimpan:', {
    id: donation.transaction_id,
    name: donation.name,
    amount: donation.amount
  });
}

// ====== ENDPOINTS ======

/**
 * ROOT - Health check
 */
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Webhook Bridge Server',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

/**
 * WEBHOOK ENDPOINT - Terima donasi dari BagiBagi
 * POST /bagibagi/webhook
 */
app.post('/bagibagi/webhook', (req, res) => {
  const body = req.body;

  // Cek berbagai kemungkinan header signature
  const signature =
    req.headers['x-signature'] ||
    req.headers['x-bagibagi-signature'] ||
    req.headers['x-webhook-signature'] ||
    req.headers['signature'];

  console.log('📥 Webhook received:', {
    transaction_id: body.transaction_id,
    name: body.name,
    amount: body.amount,
    hasSignature: !!signature
  });

  // Validasi signature (di production harus strict)
  if (NODE_ENV === 'production') {
    if (!signature) {
      console.log('❌ Signature missing');
      return res.status(401).json({ 
        ok: false, 
        error: 'Signature required' 
      });
    }

    if (!isValidSignature(body, WEBHOOK_TOKEN, signature)) {
      console.log('❌ Invalid signature');
      return res.status(401).json({ 
        ok: false, 
        error: 'Invalid signature' 
      });
    }
  } else {
    // Development mode: warning aja
    if (signature && !isValidSignature(body, WEBHOOK_TOKEN, signature)) {
      console.log('⚠️ Signature mismatch (development mode - allowed)');
    }
  }

  // Simpan donasi
  const donation = {
    transaction_id: body.transaction_id,
    name: body.name,
    amount: body.amount,
    message: body.message || '',
    mediaShareUrl: body.mediaShareUrl || null,
    created_at: body.created_at,
    received_at: new Date().toISOString()
  };

  saveDonation(donation);

  res.json({ ok: true, message: 'Donation received' });
});

/**
 * API ENDPOINT - Roblox ambil donasi terakhir
 * GET /api/roblox/last-donation
 */
app.get('/api/roblox/last-donation', (req, res) => {
  if (!lastDonation) {
    return res.json({ 
      ok: true, 
      hasDonation: false,
      message: 'No donations yet'
    });
  }

  res.json({ 
    ok: true, 
    hasDonation: true, 
    donation: lastDonation 
  });
});

/**
 * API ENDPOINT - Get donation history
 * GET /api/roblox/donation-history
 */
app.get('/api/roblox/donation-history', (req, res) => {
  const limit = parseInt(req.query.limit) || MAX_HISTORY;
  
  res.json({
    ok: true,
    count: donationHistory.length,
    donations: donationHistory.slice(0, limit)
  });
});

/**
 * API ENDPOINT - Clear last donation (setelah diproses)
 * POST /api/roblox/clear-donation
 */
app.post('/api/roblox/clear-donation', (req, res) => {
  const clearedDonation = lastDonation;
  lastDonation = null;
  
  console.log('🗑️ Last donation cleared:', clearedDonation?.transaction_id);
  
  res.json({ 
    ok: true, 
    message: 'Last donation cleared',
    cleared: clearedDonation
  });
});

/**
 * TEST ENDPOINT - Kirim fake donation untuk testing
 * POST /test/send-donation
 */
app.post('/test/send-donation', (req, res) => {
  if (NODE_ENV === 'production') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Test endpoint disabled in production' 
    });
  }

  const donation = {
    transaction_id: 'TEST-' + Date.now(),
    name: req.body.name || 'TestUser',
    amount: req.body.amount || 50000,
    message: req.body.message || 'Test donation from server',
    mediaShareUrl: req.body.mediaShareUrl || null,
    created_at: new Date().toISOString(),
    received_at: new Date().toISOString()
  };

  saveDonation(donation);

  console.log('⚙️ Test donation created');
  
  res.json({ 
    ok: true, 
    message: 'Test donation created',
    donation 
  });
});

/**
 * TEST ENDPOINT - Get server stats
 * GET /test/stats
 */
app.get('/test/stats', (req, res) => {
  res.json({
    ok: true,
    stats: {
      lastDonation: lastDonation ? {
        id: lastDonation.transaction_id,
        name: lastDonation.name,
        amount: lastDonation.amount,
        received_at: lastDonation.received_at
      } : null,
      historyCount: donationHistory.length,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: NODE_ENV
    }
  });
});

// ====== ERROR HANDLING ======

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    ok: false, 
    error: 'Endpoint not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    ok: false, 
    error: 'Internal server error' 
  });
});

// ====== START SERVER ======

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ================================');
  console.log('🚀 Webhook Bridge Server Started');
  console.log('🚀 ================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔐 Webhook Token: ${WEBHOOK_TOKEN.substring(0, 8)}...`);
  console.log('🚀 ================================');
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  GET  /                           - Health check');
  console.log('  POST /bagibagi/webhook           - Receive donations');
  console.log('  GET  /api/roblox/last-donation   - Get last donation');
  console.log('  GET  /api/roblox/donation-history - Get donation history');
  console.log('  POST /api/roblox/clear-donation  - Clear last donation');
  if (NODE_ENV !== 'production') {
    console.log('  POST /test/send-donation         - Send test donation');
    console.log('  GET  /test/stats                 - Get server stats');
  }
  console.log('');
});
