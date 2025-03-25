const axios = require('axios');
const config = require('../config/config');

// Base URL for the external API
const API_BASE_URL = config.apiBaseUrl;

// Cache for block data to reduce external API calls
const blockDataCache = {};
const timestampCache = {};

// Max age for cache items 
const CACHE_MAX_AGE = config.cache.maxAge;

/**
 * Get the maximum block number from the external API
 */
exports.getMaxBlockNumber = async (req, res) => {
  try {
    // Use cached data if available
    const cachedKey = 'max_block_number';
    if (blockDataCache[cachedKey] && 
        (Date.now() - blockDataCache[cachedKey].timestamp) < CACHE_MAX_AGE) {
      return res.json(blockDataCache[cachedKey].data);
    }

    // Fetch data from external API
    const response = await axios.get(`${API_BASE_URL}/mapper/get_max_block_number`);
    
    // Cache the result
    blockDataCache[cachedKey] = {
      data: response.data,
      timestamp: Date.now()
    };
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching max block number:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching the maximum block number',
      message: config.env === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * Get points by block range from the external API
 * Enhanced with preprocessing and data protection
 */
exports.getPointsByBlockRange = async (req, res) => {
  try {
    const { start_block, end_block } = req.query;
    
    // Validate input parameters
    if (!start_block || !end_block) {
      return res.status(400).json({ error: 'Missing required parameters: start_block and end_block' });
    }
    
    // Additional validation
    const startBlockNum = parseInt(start_block);
    const endBlockNum = parseInt(end_block);
    
    if (isNaN(startBlockNum) || isNaN(endBlockNum)) {
      return res.status(400).json({ error: 'Block numbers must be integers' });
    }
    
    if (startBlockNum > endBlockNum) {
      return res.status(400).json({ error: 'start_block must be less than or equal to end_block' });
    }
    
    // Limit range to prevent excessive data requests
    if (endBlockNum - startBlockNum > 20) {
      return res.status(400).json({ error: 'Block range too large. Maximum range is 20 blocks.' });
    }
    
    // Create a cache key based on the parameters
    const cacheKey = `${startBlockNum}_${endBlockNum}`;
    
    // Check if we have cached data for this request
    if (blockDataCache[cacheKey] && 
        (Date.now() - blockDataCache[cacheKey].timestamp) < CACHE_MAX_AGE) {
      return res.json(blockDataCache[cacheKey].data);
    }
    
    // Fetch data from external API
    const response = await axios.get(
      `${API_BASE_URL}/mapper/get_points_by_block_range_no_embedding`, {
        params: {
          start_block: startBlockNum,
          end_block: endBlockNum,
          api_key: config.apiKey
        }
      }
    );
    
    // Process data with server-side proprietary algorithms
    const processedData = processPoints(response.data);
    
    // Cache the processed data
    blockDataCache[cacheKey] = {
      data: processedData,
      timestamp: Date.now()
    };
    
    res.json(processedData);
  } catch (error) {
    console.error('Error fetching points by block range:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching points by block range',
      message: config.env === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * Get timestamp for a specific block number
 */
exports.getTimestampFromBlockNumber = async (req, res) => {
  try {
    const { blockNumber } = req.params;
    
    // Validate block number
    const blockNum = parseInt(blockNumber);
    if (isNaN(blockNum) || blockNum < 0) {
      return res.status(400).json({ error: 'Invalid block number' });
    }
    
    // Check if we have cached timestamp data
    if (timestampCache[blockNum] && 
        (Date.now() - timestampCache[blockNum].timestamp) < CACHE_MAX_AGE) {
      return res.json(timestampCache[blockNum].data);
    }
    
    // Fetch data from external API
    const response = await axios.get(
      `${API_BASE_URL}/blockchain/get_timestamp_from_block_number`, {
        params: {
          network: 'mainnet',
          block_number: blockNum
        }
      }
    );
    
    // Cache the result
    timestampCache[blockNum] = {
      data: response.data,
      timestamp: Date.now()
    };
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching timestamp:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching the timestamp',
      message: config.env === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * Process points data with custom logic
 * This is where you can add proprietary algorithms that won't be visible to clients
 */
function processPoints(data) {
  if (!data || !data.points || !Array.isArray(data.points)) {
    return data;
  }
  
  // Example of server-side data processing:
  // 1. Apply custom clustering algorithm
  const enhancedPoints = enhancePointsWithClusters(data.points);
  
  // 2. Add sentiment analysis scores
  const pointsWithSentiment = addSentimentScores(enhancedPoints);
  
  // 3. Normalize coordinates with a proprietary algorithm
  const normalizedPoints = normalizeCoordinates(pointsWithSentiment);
  
  // Return processed data
  return {
    points: normalizedPoints,
    processed: true,
    processedAt: new Date().toISOString(),
    processedBy: 'SentiMove Server v1.0'
  };
}

/**
 * Example of a proprietary clustering algorithm
 * In a real implementation, this would contain your valuable intellectual property
 */
function enhancePointsWithClusters(points) {
  // For demonstration purposes, we're just returning the original points
  // In reality, you would implement your proprietary clustering algorithm here
  return points;
}

/**
 * Example of adding sentiment scores to data points
 */
function addSentimentScores(points) {
  // For demonstration purposes, we're just returning the original points
  // In reality, you would implement your sentiment analysis algorithm here
  return points;
}

/**
 * Example of coordinates normalization
 */
function normalizeCoordinates(points) {
  // For demonstration purposes, we're just returning the original points
  // In reality, you would implement your coordinate normalization algorithm here
  return points;
} 