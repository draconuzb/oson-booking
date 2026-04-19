require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// M1 fix: Trust proxy for correct IP behind Nginx/Cloudflare
app.set('trust proxy', true);

// L1 fix: Restrict CORS in production
const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: process.env.CORS_ORIGIN || true, credentials: true }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/barbers', require('./routes/barbers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/clients', require('./routes/clients'));

// L2 fix: Health check with DB connectivity test
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'OsonBooking API', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: 'OsonBooking API', db: 'disconnected' });
  }
});

// L3 fix: Warn about default admin password on startup
async function checkAdminPassword() {
  try {
    const bcrypt = require('bcryptjs');
    const pool = require('./db/pool');
    const result = await pool.query("SELECT password_hash FROM admins WHERE username = 'admin'");
    if (result.rows.length > 0) {
      const isDefault = await bcrypt.compare('admin123', result.rows[0].password_hash);
      if (isDefault) {
        console.warn('\n⚠️  [SECURITY] Admin hisobi standart parol "admin123" bilan ishlayapti!');
        console.warn('    Iltimos, uni tezda o\'zgartiring.\n');
      }
    }
  } catch { /* DB may not be ready yet */ }
}

// H1 fix: Graceful shutdown
let server;
let botInstance;

function gracefulShutdown(signal) {
  console.log(`[Server] ${signal} received — shutting down gracefully...`);

  // Stop bot first
  if (botInstance) {
    try { botInstance.stop(); } catch {}
  }

  if (server) {
    server.close(() => {
      const pool = require('./db/pool');
      if (pool && pool.end) {
        pool.end()
          .then(() => { console.log('[Server] DB pool closed.'); process.exit(0); })
          .catch(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
    // Force exit after 10 seconds
    setTimeout(() => { console.error('[Server] Forced exit after timeout.'); process.exit(1); }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server = app.listen(PORT, () => {
  console.log(`OsonBooking API running on port ${PORT}`);
  checkAdminPassword();
});

// Start bot
if (process.env.TELEGRAM_BOT_TOKEN) {
  const { bot } = require('./bot/index');
  botInstance = bot;
} else {
  console.log('TELEGRAM_BOT_TOKEN not set — bot not started');
}
