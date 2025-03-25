const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./routes/api');

// Load environment variables
require('dotenv').config();

// Load configuration
const config = require('./config/config');

const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.env === 'production' 
    ? config.cors.origins.production 
    : config.cors.origins.development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Body parser
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve static files from the 'public' directory in production
if (config.env === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // All other GET requests not handled before will return our frontend
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
}); 