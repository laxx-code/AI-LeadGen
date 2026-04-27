require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const { requestLogger } = require('./middleware/logger');
const leadsRouter = require('./routes/leads');
const { startAutomation } = require('./services/automation');

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(requestLogger);

// ── Routes ──────────────────────────────────
app.use('/api/leads', leadsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime().toFixed(2) + 's',
    timestamp: new Date().toISOString()
  });
});

// ── Start ────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
    startAutomation(); // 👈 start daily auto-scrape scheduler
  });
});