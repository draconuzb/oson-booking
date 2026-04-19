const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalBookings, todayBookings, pending, confirmed, totalClients, totalBarbers, pendingBarbers] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM bookings'),
      pool.query('SELECT COUNT(*) FROM bookings WHERE booking_date = $1', [today]),
      pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'barber' AND status = 'active'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'barber' AND status = 'pending'"),
    ]);

    res.json({
      total_bookings: parseInt(totalBookings.rows[0].count),
      today_bookings: parseInt(todayBookings.rows[0].count),
      pending_bookings: parseInt(pending.rows[0].count),
      confirmed_bookings: parseInt(confirmed.rows[0].count),
      total_clients: parseInt(totalClients.rows[0].count),
      total_barbers: parseInt(totalBarbers.rows[0].count),
      pending_barbers: parseInt(pendingBarbers.rows[0].count),
    });
  } catch (err) {
    console.error('Stats error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
