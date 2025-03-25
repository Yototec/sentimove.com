const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const config = require('../config/config');

// API Version middleware - adds version to all responses
router.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0.0');
  next();
});

// Block data endpoints
router.get('/blocks/max', dataController.getMaxBlockNumber);
router.get('/blocks/range', dataController.getPointsByBlockRange);
router.get('/blocks/timestamp/:blockNumber', dataController.getTimestampFromBlockNumber);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
router.get('/status', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.status(200).json({
    status: 'operational',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    memory: process.memoryUsage(),
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined API routes
router.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = router; 