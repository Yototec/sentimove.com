/**
 * Server configuration settings
 */
module.exports = {
  // Environment settings
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // External API settings
  apiBaseUrl: 'https://api.sentichain.com',
  apiKey: process.env.SENTICHAIN_API_KEY || 'abc123',
  
  // CORS settings
  cors: {
    origins: {
      development: ['http://localhost:8080', 'http://127.0.0.1:8080'],
      production: ['https://sentimove.com']
    }
  },
  
  // Rate limiting settings
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Caching settings
  cache: {
    maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
  }
}; 