// iOS Viewport Height Fix
(function() {
    // Function to set the correct viewport height
    function setViewportHeight() {
        // First we get the viewport height and multiply it by 1% to get a value for a vh unit
        let vh = window.innerHeight * 0.01;
        // Then we set the value in the --vh custom property to the root of the document
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Also set the CSS variable for the actual viewport height
        document.documentElement.style.setProperty('--real-viewport-height', `${window.innerHeight}px`);
    }

    // Set the viewport height on load
    setViewportHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function() {
        setTimeout(setViewportHeight, 100); // Small delay to ensure the orientation has changed
    });

    // iOS specific: Update when the address bar hides/shows
    let lastHeight = window.innerHeight;
    setInterval(function() {
        if (window.innerHeight !== lastHeight) {
            lastHeight = window.innerHeight;
            setViewportHeight();
        }
    }, 100);

    // Detect if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        document.documentElement.classList.add('ios-device');
    }
})();

// Intelligence page JavaScript
let sentimentChart = null;
let allEventsData = [];
let marketData = {};

// Chunk tracking
let availableChunks = [];
let loadedChunks = new Set();
let isLoadingChunk = false;
let leftButtonClickCount = 0; // Track number of left button clicks

// Chunk summaries storage
let chunkSummaries = {}; // Store summaries keyed by chunk range (e.g., "0-49")
let currentHoveredChunk = null; // Track which chunk is being hovered
let hoverTimer = null; // Timer for 2-second hover
let isShowingSummary = false; // Track if we're showing summary view

// Progressive constellation animation
let constellationAnimationTimer = null; // Timer for progressive animation
let animationProgress = 0; // Track animation progress (0-100)
let isAnimatingConstellation = false; // Track if animation is in progress

// Input type tracking
let lastInputType = 'mouse'; // Track whether last input was 'mouse' or 'touch'
let inputTypeTimeout = null; // Timeout for resetting input type

// API configuration
const API_BASE = 'https://api.sentichain.com';
let TICKER = 'BTC'; // Default ticker

// API Key management
let API_KEY = null;

// Get saved symbol or default
function getSelectedSymbol() {
    const savedSymbol = localStorage.getItem('selected_symbol');
    return savedSymbol || 'BTC';
}

// Save selected symbol
function saveSelectedSymbol(symbol) {
    localStorage.setItem('selected_symbol', symbol);
    TICKER = symbol;
}

// Initialize symbol selector
function initializeSymbolSelector() {
    const selector = document.getElementById('symbolSelector');
    if (selector) {
        // Set initial value from localStorage
        TICKER = getSelectedSymbol();
        selector.value = TICKER;
        
        // Update page title
        document.title = `${TICKER} Market Sentiment Analysis - SentiMove Intelligence`;
        
        // Add change event listener
        selector.addEventListener('change', (event) => {
            const newSymbol = event.target.value;
            saveSelectedSymbol(newSymbol);
            // Update page title
            document.title = `${newSymbol} Market Sentiment Analysis - SentiMove Intelligence`;
            // Reload data with new symbol
            loadData();
        });
    }
}

// Get API key from various sources
function getApiKey() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlApiKey = urlParams.get('api_key');
    if (urlApiKey) {
        console.log('Using API key from URL parameter');
        saveApiKey(urlApiKey);
        
        // Remove API key from URL for security
        urlParams.delete('api_key');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, newUrl);
        
        return urlApiKey;
    }
    
    // Check local storage
    const savedApiKey = localStorage.getItem('sentichain_api_key');
    if (savedApiKey) {
        return savedApiKey;
    }
    
    return null;
}

// Save API key to local storage
function saveApiKey(apiKey) {
    localStorage.setItem('sentichain_api_key', apiKey);
    API_KEY = apiKey;
}

// Show API key modal
function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'api-key-modal';
    modal.innerHTML = `
        <div class="api-key-modal-content">
            <h2>API Key Required</h2>
            <p>Please enter your SentiChain API key to access market intelligence data.</p>
            <input type="text" id="apiKeyInput" placeholder="Enter your API key" />
            <div class="api-key-modal-buttons">
                <button id="submitApiKeyBtn">Submit</button>
                <a href="https://sentichain.com" target="_blank" class="api-key-link">Get API Key →</a>
            </div>
            <p class="api-key-note">Your API key will be saved locally for future visits.</p>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listeners
    const input = document.getElementById('apiKeyInput');
    const submitBtn = document.getElementById('submitApiKeyBtn');
    
    // Submit on button click
    submitBtn.addEventListener('click', submitApiKey);
    
    // Submit on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitApiKey();
        }
    });
    
    // Focus input
    setTimeout(() => {
        input.focus();
    }, 100);
}

// Submit API key from modal
function submitApiKey() {
    const input = document.getElementById('apiKeyInput');
    const apiKey = input.value.trim();
    
    if (!apiKey) {
        alert('Please enter a valid API key');
        return;
    }
    
    saveApiKey(apiKey);
    
    // Remove modal
    const modal = document.querySelector('.api-key-modal');
    if (modal) {
        modal.remove();
    }
    
    // Add the Change API Key button
    addApiKeyButton();
    
    // Reload data with new key
    loadData();
}

// Add API key change button
function addApiKeyButton() {
    // Check if button already exists
    if (document.querySelector('.change-api-key-btn')) {
        return; // Button already exists, don't add another
    }
    
    const button = document.createElement('button');
    button.className = 'change-api-key-btn';
    button.textContent = 'Change API Key';
    button.onclick = () => {
        if (confirm('Do you want to change your API key?')) {
            localStorage.removeItem('sentichain_api_key');
            API_KEY = null;
            location.reload();
        }
    };
    
    const header = document.querySelector('header nav');
    if (header) {
        header.appendChild(button);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize symbol selector first
    initializeSymbolSelector();
    
    // Get API key
    API_KEY = getApiKey();
    
    if (!API_KEY) {
        showApiKeyModal();
    } else {
        loadData();
        addApiKeyButton();
    }
    
    // Initialize navigation buttons
    initializeNavButtons();
});

// Initialize navigation buttons
function initializeNavButtons() {
    const earlierBtn = document.getElementById('loadEarlierBtn');
    
    if (earlierBtn) {
        earlierBtn.addEventListener('click', () => {
            if (leftButtonClickCount < 5) {
                leftButtonClickCount++;
                loadEarlierData();
            }
        });
    }
}

// Update navigation button states
function updateNavButtonStates() {
    const earlierBtn = document.getElementById('loadEarlierBtn');
    
    if (!earlierBtn) return;
    
    // Check if there are earlier chunks to load
    const sortedLoadedChunks = [...loadedChunks].sort();
    let canLoadEarlier = false;
    
    if (sortedLoadedChunks.length > 0 && availableChunks.length > 0) {
        const minLoadedChunk = sortedLoadedChunks[0];
        const [minStart] = minLoadedChunk.split('-').map(Number);
        const minChunkIndex = availableChunks.findIndex(c => c.chunk_start === minStart);
        canLoadEarlier = minChunkIndex > 0;
    }
    
    // Check if we've reached the 5-click limit
    const reachedClickLimit = leftButtonClickCount >= 5;
    
    // Update button state
    earlierBtn.disabled = !canLoadEarlier || isLoadingChunk || reachedClickLimit;
    
    // Update click counter display
    const counterElement = document.getElementById('clickCounter');
    if (counterElement) {
        const remainingClicks = 5 - leftButtonClickCount;
        counterElement.textContent = remainingClicks;
    }
    
    // Update button text to show remaining clicks
    if (reachedClickLimit) {
        earlierBtn.title = "Maximum data loaded (5 chunks)";
    } else {
        const remainingClicks = 5 - leftButtonClickCount;
        earlierBtn.title = `Load earlier data (${remainingClicks} more available)`;
    }
}

// Load earlier data
async function loadEarlierData() {
    if (isLoadingChunk) return;
    
    const sortedLoadedChunks = [...loadedChunks].sort();
    if (sortedLoadedChunks.length === 0) return;
    
    const minLoadedChunk = sortedLoadedChunks[0];
    const [minStart] = minLoadedChunk.split('-').map(Number);
    const minChunkIndex = availableChunks.findIndex(c => c.chunk_start === minStart);
    
    if (minChunkIndex > 0) {
        await loadAdditionalChunk(minChunkIndex - 1);
    }
}

// Update loading message
function updateLoadingMessage(main, detail = '') {
    const mainElement = document.getElementById('loadingMessage');
    const detailElement = document.getElementById('loadingDetail');
    
    if (mainElement) {
        mainElement.textContent = main;
    }
    if (detailElement) {
        detailElement.textContent = detail;
    }
}

// Main function to load and process data
async function loadData() {
    if (!API_KEY) {
        console.error('No API key available');
        return;
    }
    
    showLoading();
    updateLoadingMessage('Connecting to SentiChain API...', `Initializing ${TICKER} data`);
    
    // Disable symbol selector during loading
    const symbolSelector = document.getElementById('symbolSelector');
    if (symbolSelector) {
        symbolSelector.disabled = true;
    }
    
    // Stop any ongoing animations
    stopProgressiveConstellation();
    
    // Reset chunk tracking when loading new symbol
    loadedChunks.clear();
    allEventsData = [];
    marketData = {};
    chunkSummaries = {}; // Reset chunk summaries
    leftButtonClickCount = 0; // Reset click counter for new symbol
    isShowingSummary = false; // Reset summary view state
    
    try {
        // Step 1: Get available chunks
        updateLoadingMessage('Fetching available data chunks...', `Scanning ${TICKER} sentiment history`);
        const chunkInfo = await fetchAvailableChunks();
        
        // Step 2: Get reasoning data for the last chunk
        updateLoadingMessage('Loading sentiment analysis...', `Processing ${TICKER} events (chunk ${chunkInfo.chunkIndex + 1} of ${availableChunks.length})`);
        const reasoningData = await fetchReasoningData(chunkInfo);
        
        // Step 2.5: Get summary data for this chunk
        const chunkKey = `${chunkInfo.chunk_start}-${chunkInfo.chunk_end}`;
        const summaryData = await fetchSummaryData(chunkInfo.chunk_start, chunkInfo.chunk_end);
        if (summaryData) {
            chunkSummaries[chunkKey] = summaryData;
        }
        
        // Step 3: Process reasoning data
        updateLoadingMessage('Processing event data...', 'Analyzing sentiment patterns');
        const processedEvents = processReasoningData(reasoningData, chunkInfo);
        
        if (processedEvents.length === 0) {
            throw new Error('No events data found');
        }
        
        // Step 4: Get time range for market data
        const timeRange = getTimeRange(processedEvents);
        
        // Step 5: Get market data
        updateLoadingMessage('Fetching market prices...', `Loading ${TICKER} price data for ${processedEvents.length} events`);
        const marketDataResponse = await fetchMarketData(timeRange.start, timeRange.end);
        
        // Step 6: Process and display data
        updateLoadingMessage('Creating visualization...', 'Preparing interactive chart');
        allEventsData = processedEvents;
        marketData = marketDataResponse;
        
        // Mark initial chunk as loaded
        loadedChunks.add(chunkKey);
        
        // Step 7: Create visualization
        createScatterPlot(processedEvents, marketDataResponse);
        
        // Step 8: Display events list
        displayEvents(processedEvents);
        
        // Step 9: Update navigation button states
        updateNavButtonStates();
        
        showContent();
        
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            showError('Invalid API key. Please check your API key and try again.');
            setTimeout(() => {
                localStorage.removeItem('sentichain_api_key');
                location.reload();
            }, 3000);
        } else {
            showError(error.message);
        }
    } finally {
        // Re-enable symbol selector
        if (symbolSelector) {
            symbolSelector.disabled = false;
        }
        isLoadingChunk = false;
        // Hide loading indicator
        const loadingIndicator = document.getElementById('chunkLoading');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
        // Update button states
        updateNavButtonStates();
    }
}

// Fetch available chunks from API
async function fetchAvailableChunks() {
    const url = `${API_BASE}/agent/list_reasoning?ticker=${TICKER}&summary_type=l3_event_sentiment_reasoning&api_key=${API_KEY}`;
    
    console.log(`Fetching available chunks for ${TICKER}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch available chunks: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.meta || !Array.isArray(data.meta) || data.meta.length === 0) {
        throw new Error('No chunks available for this ticker');
    }
    
    // Store all available chunks
    availableChunks = data.meta;
    
    // Get the last chunk (most recent data)
    const lastChunk = data.meta[data.meta.length - 1];
    const lastChunkIndex = data.meta.length - 1;
    console.log(`Using chunk: ${lastChunk.chunk_start} to ${lastChunk.chunk_end}`);
    
    return {
        chunk_start: lastChunk.chunk_start,
        chunk_end: lastChunk.chunk_end,
        chunkIndex: lastChunkIndex
    };
}

// Fetch reasoning data from API
async function fetchReasoningData(chunkInfo) {
    const url = `${API_BASE}/agent/get_reasoning?ticker=${TICKER}&summary_type=l3_event_sentiment_reasoning&chunk_start=${chunkInfo.chunk_start}&chunk_end=${chunkInfo.chunk_end}&api_key=${API_KEY}`;
    
    console.log(`Fetching reasoning data for ${TICKER} (chunk ${chunkInfo.chunk_start}-${chunkInfo.chunk_end})...`);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch reasoning data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
}

// Fetch summary data from API
async function fetchSummaryData(chunkStart, chunkEnd) {
    const url = `${API_BASE}/agent/get_reasoning?ticker=${TICKER}&summary_type=l3_event_sentiment_summary_reasoning&chunk_start=${chunkStart}&chunk_end=${chunkEnd}&api_key=${API_KEY}`;
    
    console.log(`Fetching summary data for ${TICKER} (chunk ${chunkStart}-${chunkEnd})...`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch summary data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Parse the summary data
        if (data.reasoning) {
            const summaryArray = JSON.parse(data.reasoning);
            if (summaryArray && summaryArray.length > 0) {
                return summaryArray[0]; // Return the first (and likely only) summary object
            }
        }
    } catch (error) {
        console.error('Error fetching summary data:', error);
    }
    
    return null;
}

// Process reasoning data
function processReasoningData(data, chunkInfo) {
    try {
        // Parse the reasoning JSON string
        let eventsArray;
        
        if (data.reasoning) {
            // Extract JSON from the markdown code block
            const jsonMatch = data.reasoning.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                eventsArray = JSON.parse(jsonMatch[1]);
            } else {
                // Try parsing directly
                eventsArray = JSON.parse(data.reasoning);
            }
        } else {
            throw new Error('No reasoning data found in response');
        }
        
        if (!Array.isArray(eventsArray)) {
            throw new Error('Events data is not an array');
        }
        
        // Add chunk information to each event
        const chunkKey = chunkInfo ? `${chunkInfo.chunk_start}-${chunkInfo.chunk_end}` : null;
        eventsArray = eventsArray.map(event => ({
            ...event,
            chunkKey: chunkKey
        }));
        
        // Sort by timestamp (all timestamps are UTC)
        eventsArray.sort((a, b) => new Date(a.timestamp + 'Z') - new Date(b.timestamp + 'Z'));
        
        console.log('Processed events count:', eventsArray.length);
        return eventsArray;
        
    } catch (error) {
        console.error('Error processing reasoning data:', error);
        throw new Error('Failed to process events data: ' + error.message);
    }
}

// Get time range from events
function getTimeRange(events) {
    if (events.length === 0) {
        throw new Error('No events to get time range from');
    }
    
    // Ensure timestamps are treated as UTC
    const timestamps = events.map(event => new Date(event.timestamp + 'Z'));
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    
    return {
        start: start.toISOString(),
        end: end.toISOString(),
        startDate: start,
        endDate: end
    };
}

// Fetch market data
async function fetchMarketData(startDate, endDate) {
    const url = `${API_BASE}/market/get_data?ticker=${TICKER}&sdate=${startDate}&edate=${endDate}&freq=minute&api_key=${API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const marketData = data.data || {};
    
    console.log(`Market data received: ${Object.keys(marketData).length} data points`);
    
    return marketData;
}

// Match event timestamp with nearest market data
function findNearestMarketPrice(eventTimestamp, marketData) {
    // Try different timestamp parsing approaches
    let eventTime;
    
    // Check if timestamp already has timezone info
    if (eventTimestamp.includes('Z') || eventTimestamp.includes('+') || eventTimestamp.includes('-')) {
        eventTime = new Date(eventTimestamp);
    } else {
        // Assume UTC if no timezone specified
        eventTime = new Date(eventTimestamp + 'Z');
    }
    
    let nearestPrice = null;
    let minTimeDiff = Infinity;
    let nearestTimestamp = null;
    
    const marketEntries = Object.entries(marketData);
    
    for (const [marketTimestamp, priceData] of marketEntries) {
        // Parse market timestamp
        const marketTime = new Date(marketTimestamp);
        const timeDiff = Math.abs(eventTime - marketTime);
        
        if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            nearestPrice = priceData.c;
            nearestTimestamp = marketTimestamp;
        }
    }
    
    return nearestPrice;
}

// Create scatter plot
function createScatterPlot(events, marketData) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Define colors for each event type
    const eventTypeColors = {
        'macro': '#FF8888',      // Bright Red
        'industry': '#88FFFF',   // Bright Cyan
        'price': '#FFFF88',      // Bright Yellow
        'asset': '#88FF88'       // Bright Green
    };
    
    // Define hover colors (even brighter) for each event type - stars glow brighter on hover
    const eventTypeHoverColors = {
        'macro': '#FFAAAA',      // Brighter Red
        'industry': '#AAFFFF',   // Brighter Cyan
        'price': '#FFFFAA',      // Brighter Yellow
        'asset': '#AAFFAA'       // Brighter Green
    };
    
    // Prepare data points with chunk information
    const dataPoints = events.map((event, index) => {
        const price = findNearestMarketPrice(event.timestamp, marketData);
        
        // Ensure consistent timestamp parsing for chart
        let eventTime;
        if (event.timestamp.includes('Z') || event.timestamp.includes('+') || event.timestamp.includes('-')) {
            eventTime = new Date(event.timestamp);
        } else {
            eventTime = new Date(event.timestamp + 'Z');
        }
        
        return {
            x: eventTime,
            y: price,
            summary: event.summary,
            sentiment: event.sentiment,
            event: event.event,
            eventIndex: index, // Store original index
            chunkKey: event.chunkKey // Use chunk key from event
        };
    }).filter(point => point.y !== null && point.y !== undefined); // Filter out points without price data
    
    if (dataPoints.length === 0) {
        console.error('No valid data points found!');
        showError('No price data available for the selected time range');
        return;
    }
    
    // Calculate price range for auto-scaling
    const prices = dataPoints.map(point => point.y);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Handle edge case where all prices are the same
    let yAxisMin, yAxisMax;
    if (priceRange === 0) {
        // If all prices are the same, create a small range around that price
        const centerPrice = minPrice;
        const smallRange = centerPrice * 0.001; // 0.1% of the price
        yAxisMin = centerPrice - smallRange;
        yAxisMax = centerPrice + smallRange;
    } else {
        // Add padding (5% on each side) to make fluctuations more visible
        const padding = priceRange * 0.05;
        yAxisMin = Math.max(0, minPrice - padding);
        yAxisMax = maxPrice + padding;
    }
    
    console.log(`Chart created with ${dataPoints.length} data points`);
    console.log(`Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
    
    // Create constellation datasets (line connections within chunks)
    const constellationDatasets = [];
    const chunkGroups = {};
    
    // Group points by chunk
    dataPoints.forEach(point => {
        if (point.chunkKey) {
            if (!chunkGroups[point.chunkKey]) {
                chunkGroups[point.chunkKey] = [];
            }
            chunkGroups[point.chunkKey].push(point);
        }
    });
    
    // Create line datasets for each chunk
    Object.entries(chunkGroups).forEach(([chunkKey, points]) => {
        if (points.length > 1) {
            // Sort points by time
            points.sort((a, b) => a.x - b.x);
            
            constellationDatasets.push({
                label: `Constellation ${chunkKey}`,
                data: points,
                borderColor: 'rgba(255, 255, 255, 0.15)', // Thin white lines
                borderWidth: 1,
                pointRadius: 0, // Hide points for line datasets
                pointHoverRadius: 0,
                showLine: true,
                fill: false,
                tension: 0, // Straight lines
                type: 'line',
                order: 2 // Draw behind scatter points
            });
        }
    });
    
    // Group data by event type for scatter datasets
    const eventTypes = ['macro', 'industry', 'price', 'asset'];
    const scatterDatasets = eventTypes.map(eventType => {
        const typeData = dataPoints.filter(point => 
            point.event.toLowerCase() === eventType
        );
        
        return {
            label: eventType.charAt(0).toUpperCase() + eventType.slice(1) + ' Events',
            data: typeData,
            backgroundColor: eventTypeColors[eventType],
            borderColor: 'rgba(255, 255, 255, 0.4)',
            borderWidth: 1,
            pointBackgroundColor: eventTypeColors[eventType],
            pointBorderColor: 'rgba(255, 255, 255, 0.4)', 
            pointBorderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 10,
            pointHoverBackgroundColor: eventTypeHoverColors[eventType],
            pointHoverBorderColor: 'rgba(255, 255, 255, 0.8)',
            pointHoverBorderWidth: 2,
            pointStyle: 'circle',
            showLine: false,
            type: 'scatter',
            order: 1 // Draw above lines
        };
    }).filter(dataset => dataset.data.length > 0);
    
    // Combine all datasets (constellations + scatter points)
    const allDatasets = [...constellationDatasets, ...scatterDatasets];
    
    // Destroy existing chart if it exists
    if (sentimentChart) {
        sentimentChart.destroy();
    }
    
    // Create new chart
    sentimentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: allDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: !isMobile, // Hide legend on mobile
                    labels: {
                        color: '#cccccc',
                        usePointStyle: true,
                        padding: 10,
                        font: {
                            size: 11
                        },
                        filter: function(item, chart) {
                            // Hide constellation datasets from legend
                            return !item.text.startsWith('Constellation');
                        }
                    },
                    position: 'top'
                },
                tooltip: {
                    enabled: false // Disable tooltip
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'MMM dd HH:mm',
                            day: 'MMM dd'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (Local Timezone)',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#888888'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        lineWidth: 0.5
                    }
                },
                y: {
                    min: yAxisMin,
                    max: yAxisMax,
                    title: {
                        display: true,
                        text: 'Price (USD)',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#888888',
                        callback: function(value) {
                            return '$' + value.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            });
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        lineWidth: 0.5
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'point'
            },
            onHover: (event, activeElements) => {
                const canvas = event.native.target;
                
                // Use actual input type instead of device capability
                const isUsingTouch = lastInputType === 'touch';
                
                // Debug logging
                if (activeElements.length > 0 && !isUsingTouch) {
                    console.log('Mouse hover detected:', { lastInputType, activeElements: activeElements.length });
                }
                
                // Clear any existing hover timer
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
                
                // Stop any ongoing animation if we're not hovering
                if (activeElements.length === 0) {
                    stopProgressiveConstellation();
                }
                
                if (activeElements.length > 0) {
                    // Find the actual data point (skip constellation lines)
                    let dataPoint = null;
                    let datasetIndex = -1;
                    let pointIndex = -1;
                    
                    for (const element of activeElements) {
                        const dataset = sentimentChart.data.datasets[element.datasetIndex];
                        if (dataset.type !== 'line' || dataset.label?.startsWith('Constellation') === false) {
                            dataPoint = dataset.data[element.index];
                            datasetIndex = element.datasetIndex;
                            pointIndex = element.index;
                            break;
                        }
                    }
                    
                    if (dataPoint) {
                        canvas.style.cursor = 'pointer';
                        
                        // Immediate highlight of single event
                        if (dataPoint.eventIndex !== undefined) {
                            highlightEventItem(dataPoint.eventIndex);
                        }
                        
                        // Only start constellation animation when using mouse (not touch)
                        if (!isUsingTouch) {
                            console.log('Mouse: checking chunk hover', { 
                                currentHoveredChunk, 
                                dataPointChunkKey: dataPoint.chunkKey,
                                isShowingSummary 
                            });
                            
                            // Check if we're hovering over a different chunk
                            if (currentHoveredChunk !== dataPoint.chunkKey) {
                                // Stop any existing animation
                                stopProgressiveConstellation();
                                currentHoveredChunk = dataPoint.chunkKey;
                                
                                console.log('Mouse: starting constellation for chunk', dataPoint.chunkKey);
                                
                                // Start progressive constellation animation immediately
                                if (dataPoint.chunkKey && !isShowingSummary) {
                                    startProgressiveConstellation(dataPoint.chunkKey);
                                }
                            }
                        }
                    }
                } else {
                    canvas.style.cursor = 'default';
                    currentHoveredChunk = null;
                    
                    // Remove highlight when not hovering
                    if (!isShowingSummary) {
                        document.querySelectorAll('.event-item').forEach(item => {
                            item.classList.remove('highlighted');
                        });
                    }
                }
            },
            onClick: (event, activeElements) => {
                // If showing summary, clicking anywhere reverts to events view
                if (isShowingSummary) {
                    revertToEventsView();
                    resetChartHighlights();
                } else {
                    // Normal click behavior
                    if (activeElements.length > 0) {
                        // Find the actual data point (skip constellation lines)
                        let dataPoint = null;
                        
                        for (const element of activeElements) {
                            const dataset = sentimentChart.data.datasets[element.datasetIndex];
                            if (dataset.type !== 'line' || dataset.label?.startsWith('Constellation') === false) {
                                dataPoint = dataset.data[element.index];
                                break;
                            }
                        }
                        
                        if (dataPoint && dataPoint.eventIndex !== undefined) {
                            // Clear all highlights first
                            document.querySelectorAll('.event-item').forEach(item => {
                                item.classList.remove('highlighted');
                            });
                            
                            // Highlight the clicked point's corresponding event
                            highlightEventItem(dataPoint.eventIndex);
                            
                            // Keep the event highlighted for mobile
                            if ('ontouchstart' in window) {
                                setTimeout(() => {
                                    document.querySelectorAll('.event-item').forEach(item => {
                                        item.classList.remove('highlighted');
                                    });
                                }, 3000); // Remove after 3 seconds on mobile
                            }
                        }
                    }
                }
            }
        }
    });
    
    // Store the data points for chunk animation
    sentimentChart.starsByChunk = chunkGroups;
    
    // Add touch event handling for mobile long-press
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        addMobileTouchHandlers(ctx.canvas);
    }
}

// Add mobile touch handlers for long-press detection
function addMobileTouchHandlers(canvas) {
    let touchStartTime = 0;
    let touchTimer = null;
    let touchedPoint = null;
    let isTouchMoving = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchActive = false; // Add flag to track if touch is still active
    
    const chartContainer = canvas.closest('.chart-container');
    
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return; // Only handle single touch
        
        // Prevent default to avoid text selection and context menus
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        touchStartX = x;
        touchStartY = y;
        touchStartTime = Date.now();
        isTouchMoving = false;
        isTouchActive = true; // Set touch as active
        
        // Find if we're touching a point
        const canvasPosition = Chart.helpers.getRelativePosition(e, sentimentChart);
        const datasetIndex = sentimentChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
        
        if (datasetIndex.length > 0) {
            const firstPoint = datasetIndex[0];
            const dataset = sentimentChart.data.datasets[firstPoint.datasetIndex];
            
            // Skip constellation lines
            if (dataset.type !== 'line' || !dataset.label?.startsWith('Constellation')) {
                touchedPoint = dataset.data[firstPoint.index];
                
                // Add visual feedback for long press
                chartContainer.classList.add('touch-holding');
                
                // Set up long press timer (500ms for mobile)
                touchTimer = setTimeout(() => {
                    // Only proceed if touch is still active
                    if (isTouchActive && !isTouchMoving && touchedPoint && touchedPoint.chunkKey) {
                        // Haptic feedback if available
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                        
                        // Stop any existing animation
                        stopProgressiveConstellation();
                        currentHoveredChunk = touchedPoint.chunkKey;
                        
                        // Start progressive constellation animation
                        if (!isShowingSummary) {
                            startProgressiveConstellation(touchedPoint.chunkKey);
                        }
                    }
                }, 500); // 500ms for long press
            }
        }
    }, { passive: false }); // Make it non-passive so we can preventDefault
    
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Check if moved more than 10 pixels
        const moveDistance = Math.sqrt(Math.pow(x - touchStartX, 2) + Math.pow(y - touchStartY, 2));
        if (moveDistance > 10) {
            isTouchMoving = true;
            
            // Remove visual feedback
            chartContainer.classList.remove('touch-holding');
            
            // Cancel long press timer
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            
            // Stop any ongoing animation
            stopProgressiveConstellation();
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        // Prevent default to avoid any lingering selection behavior
        e.preventDefault();
        
        const touchDuration = Date.now() - touchStartTime;
        
        // Mark touch as inactive immediately
        isTouchActive = false;
        
        // Remove visual feedback
        chartContainer.classList.remove('touch-holding');
        
        // Clear long press timer
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
        
        // Check if we're showing summary and this is a quick tap
        if (isShowingSummary && touchDuration < 500 && !isTouchMoving) {
            // Revert to events view
            revertToEventsView();
            resetChartHighlights();
        }
        // If it was a quick tap (less than 500ms) and not moving
        else if (touchDuration < 500 && !isTouchMoving && touchedPoint) {
            // Handle as a normal click - highlight the event
            if (touchedPoint.eventIndex !== undefined) {
                // Clear all highlights first
                document.querySelectorAll('.event-item').forEach(item => {
                    item.classList.remove('highlighted');
                });
                
                // Highlight the clicked point's corresponding event
                highlightEventItem(touchedPoint.eventIndex);
                
                // Keep the event highlighted for 3 seconds on mobile
                setTimeout(() => {
                    document.querySelectorAll('.event-item').forEach(item => {
                        item.classList.remove('highlighted');
                    });
                }, 3000);
            }
        }
        // If it was a quick tap on empty space (no point touched)
        else if (touchDuration < 500 && !isTouchMoving && !touchedPoint && isShowingSummary) {
            // Also revert to events view when tapping empty space
            revertToEventsView();
            resetChartHighlights();
        }
        
        // Reset
        touchedPoint = null;
        isTouchMoving = false;
    }, { passive: false }); // Make it non-passive so we can preventDefault
    
    canvas.addEventListener('touchcancel', () => {
        // Mark touch as inactive
        isTouchActive = false;
        
        // Remove visual feedback
        chartContainer.classList.remove('touch-holding');
        
        // Clear any timers and reset state
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
        touchedPoint = null;
        isTouchMoving = false;
        stopProgressiveConstellation();
    });
}

// Display events list
function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '';
    
    // Define colors for each event type (same as in chart)
    const eventTypeColors = {
        'macro': '#FF8888',      // Bright Red
        'industry': '#88FFFF',   // Bright Cyan
        'price': '#FFFF88',      // Bright Yellow
        'asset': '#88FF88'       // Bright Green
    };
    
    // Create a copy and reverse to show most recent first
    const reversedEvents = [...events].reverse();
    
    reversedEvents.forEach((event, reversedIndex) => {
        // Calculate original index for chart correlation
        const originalIndex = events.length - 1 - reversedIndex;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.setAttribute('data-event-index', originalIndex);
        
        // Convert UTC timestamp to local time for display
        const localTime = new Date(event.timestamp + 'Z').toLocaleString();
        const utcTime = event.timestamp + ' UTC';
        
        // Get color for event type
        const eventColor = eventTypeColors[event.event.toLowerCase()] || '#888888';
        
        eventElement.innerHTML = `
            <div class="event-header">
                <span class="event-timestamp" title="${utcTime}">${localTime} (Local)</span>
                <span class="event-sentiment ${event.sentiment.toLowerCase()}">${event.sentiment}</span>
            </div>
            <div class="event-summary">${event.summary}</div>
            <div class="event-footer">
                <span class="event-type" style="background-color: ${eventColor}; color: #000000;">
                    ${event.event.toUpperCase()}
                </span>
            </div>
        `;
        
        // Add hover handlers to highlight corresponding chart point
        eventElement.addEventListener('mouseenter', () => {
            highlightChartPoint(originalIndex);
            eventElement.classList.add('highlighted');
        });
        
        eventElement.addEventListener('mouseleave', () => {
            // Reset chart points
            resetChartHighlights();
            eventElement.classList.remove('highlighted');
        });
        
        // Add touch support for mobile devices
        let touchTimeout;
        let touchStartY = 0;
        
        eventElement.addEventListener('touchstart', (e) => {
            // Store initial touch position
            touchStartY = e.touches[0].clientY;
            
            // Clear any existing timeout
            if (touchTimeout) {
                clearTimeout(touchTimeout);
            }
            
            // Highlight immediately on touch
            highlightChartPoint(originalIndex);
            eventElement.classList.add('highlighted');
        });
        
        eventElement.addEventListener('touchend', (e) => {
            // Check if it was a tap (not a scroll)
            const touchEndY = e.changedTouches[0].clientY;
            const touchDistance = Math.abs(touchEndY - touchStartY);
            
            if (touchDistance < 10) { // Was a tap, not a scroll
                // Keep highlighted for a moment
                touchTimeout = setTimeout(() => {
                    resetChartHighlights();
                    eventElement.classList.remove('highlighted');
                }, 2000);
            } else {
                // Was a scroll, remove highlight immediately
                resetChartHighlights();
                eventElement.classList.remove('highlighted');
            }
        });
        
        // Also handle click for better compatibility
        eventElement.addEventListener('click', (e) => {
            // Check if it's a touch device
            if ('ontouchstart' in window) {
                // Touch device - already handled by touchstart
                return;
            }
            
            // Non-touch device - toggle highlight
            if (eventElement.classList.contains('highlighted')) {
                resetChartHighlights();
                eventElement.classList.remove('highlighted');
            } else {
                // Remove other highlights first
                document.querySelectorAll('.event-item').forEach(item => {
                    item.classList.remove('highlighted');
                });
                resetChartHighlights();
                
                // Add highlight
                highlightChartPoint(originalIndex);
                eventElement.classList.add('highlighted');
            }
        });
        
        container.appendChild(eventElement);
    });
}

// Highlight specific event item
function highlightEventItem(eventIndex) {
    // Remove highlight from all events
    document.querySelectorAll('.event-item').forEach(item => {
        item.classList.remove('highlighted');
    });
    
    // Add highlight to specific event
    const targetEvent = document.querySelector(`[data-event-index="${eventIndex}"]`);
    if (targetEvent) {
        targetEvent.classList.add('highlighted');
        // Scroll into view if needed
        targetEvent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Highlight specific chart point
function highlightChartPoint(eventIndex) {
    if (!sentimentChart) return;
    
    // Reset all points to normal size first
    resetChartHighlights();
    
    // Find and highlight the specific point by eventIndex
    sentimentChart.data.datasets.forEach(dataset => {
        dataset.data.forEach((point, pointIndex) => {
            if (point.eventIndex === eventIndex) {
                // Make arrays if they aren't already
                if (!Array.isArray(dataset.pointRadius)) {
                    dataset.pointRadius = new Array(dataset.data.length).fill(6);
                    dataset.pointBorderWidth = new Array(dataset.data.length).fill(1);
                }
                // Highlight this point
                dataset.pointRadius[pointIndex] = 10;
                dataset.pointBorderWidth[pointIndex] = 2;
            }
        });
    });
    
    sentimentChart.update('none'); // Update without animation for smoother hover
}

// Reset all chart highlights
function resetChartHighlights() {
    if (!sentimentChart) return;
    
    // Reset all points to normal size
    sentimentChart.data.datasets.forEach(dataset => {
        if (Array.isArray(dataset.pointRadius)) {
            dataset.pointRadius.fill(6);
            dataset.pointBorderWidth.fill(1);
        } else {
            dataset.pointRadius = 6;
            dataset.pointBorderWidth = 1;
        }
    });
    
    sentimentChart.update('none'); // Update without animation for smoother hover
}

// Show chunk summary in the left panel
function showChunkSummary(chunkKey) {
    const summary = chunkSummaries[chunkKey];
    if (!summary) {
        console.warn(`No summary found for chunk ${chunkKey}`);
        return;
    }
    
    isShowingSummary = true;
    
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '';
    
    // Create summary display
    const summaryElement = document.createElement('div');
    summaryElement.className = 'chunk-summary';
    summaryElement.innerHTML = `
        <div class="chunk-summary-content">
            ${createSummarySection('Macro', summary.macro, '#FF8888')}
            ${createSummarySection('Industry', summary.industry, '#88FFFF')}
            ${createSummarySection('Price', summary.price, '#FFFF88')}
            ${createSummarySection('Asset', summary.asset, '#88FF88')}
        </div>
    `;
    
    container.appendChild(summaryElement);
}

// Create a summary section for a specific event type
function createSummarySection(type, content, color) {
    if (!content || content === 'none') {
        return ''; // Don't show sections with no content
    }
    
    return `
        <div class="summary-section">
            <div class="summary-type" style="background-color: ${color}; color: #000000;">
                ${type.toUpperCase()}
            </div>
            <div class="summary-text">${content}</div>
        </div>
    `;
}

// Animate stars in a chunk
function animateChunkStars(chunkKey) {
    if (!sentimentChart || !sentimentChart.starsByChunk) return;
    
    const chunkPoints = sentimentChart.starsByChunk[chunkKey];
    if (!chunkPoints || chunkPoints.length === 0) return;
    
    // Find all datasets that contain points from this chunk
    sentimentChart.data.datasets.forEach(dataset => {
        if (dataset.type === 'scatter' || !dataset.type) {
            // Create arrays for radius and border width if not already arrays
            if (!Array.isArray(dataset.pointRadius)) {
                dataset.pointRadius = new Array(dataset.data.length).fill(6);
            }
            if (!Array.isArray(dataset.pointBorderWidth)) {
                dataset.pointBorderWidth = new Array(dataset.data.length).fill(1);
            }
            
            // Enlarge points that belong to this chunk
            dataset.data.forEach((point, index) => {
                if (point.chunkKey === chunkKey) {
                    dataset.pointRadius[index] = 12; // Larger size for chunk animation
                    dataset.pointBorderWidth[index] = 3;
                }
            });
        }
        // Make constellation lines more prominent
        else if (dataset.type === 'line' && dataset.label === `Constellation ${chunkKey}`) {
            dataset.borderColor = 'rgba(255, 255, 255, 0.5)'; // Brighter white
            dataset.borderWidth = 2; // Thicker line
        }
    });
    
    sentimentChart.update('none');
}

// Revert from summary view back to events view
function revertToEventsView() {
    isShowingSummary = false;
    currentHoveredChunk = null;
    
    // Clear hover timer
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }
    
    // Stop any ongoing progressive animation
    stopProgressiveConstellation();
    
    // Restore events display
    displayEvents(allEventsData);
    
    // Reset chart appearance
    resetChunkAnimation();
}

// Reset chunk animation
function resetChunkAnimation() {
    if (!sentimentChart) return;
    
    sentimentChart.data.datasets.forEach(dataset => {
        if (dataset.type === 'scatter' || !dataset.type) {
            // Reset all points to normal size
            if (Array.isArray(dataset.pointRadius)) {
                dataset.pointRadius.fill(6);
            } else {
                dataset.pointRadius = 6;
            }
            
            if (Array.isArray(dataset.pointBorderWidth)) {
                dataset.pointBorderWidth.fill(1);
            } else {
                dataset.pointBorderWidth = 1;
            }
        }
        // Reset constellation lines
        else if (dataset.type === 'line' && dataset.label?.startsWith('Constellation')) {
            dataset.borderColor = 'rgba(255, 255, 255, 0.15)'; // Back to thin white
            dataset.borderWidth = 1;
        }
    });
    
    sentimentChart.update('none');
}

// Progressive constellation animation
function startProgressiveConstellation(chunkKey) {
    if (!sentimentChart || !sentimentChart.starsByChunk) return;
    
    const chunkPoints = sentimentChart.starsByChunk[chunkKey];
    if (!chunkPoints || chunkPoints.length === 0) return;
    
    // Reset animation state
    animationProgress = 0;
    isAnimatingConstellation = true;
    
    // Add animation class to chart container
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.classList.add('animating-constellation');
    }
    
    // Sort points by time for sequential animation
    const sortedPoints = [...chunkPoints].sort((a, b) => a.x - b.x);
    const totalPoints = sortedPoints.length;
    
    // Clear any existing animation timer
    if (constellationAnimationTimer) {
        clearInterval(constellationAnimationTimer);
    }
    
    // Calculate animation intervals
    const animationDuration = 2000; // 2 seconds total
    const updateInterval = 50; // Update every 50ms
    const progressPerUpdate = 100 / (animationDuration / updateInterval);
    
    // Find constellation line dataset
    let constellationDataset = null;
    sentimentChart.data.datasets.forEach(dataset => {
        if (dataset.type === 'line' && dataset.label === `Constellation ${chunkKey}`) {
            constellationDataset = dataset;
            // Start with invisible line
            dataset.borderColor = 'rgba(255, 255, 255, 0)';
            dataset.borderWidth = 1;
        }
    });
    
    // Reset all points in the chunk to normal size first
    sentimentChart.data.datasets.forEach(dataset => {
        if (dataset.type === 'scatter' || !dataset.type) {
            if (!Array.isArray(dataset.pointRadius)) {
                dataset.pointRadius = new Array(dataset.data.length).fill(6);
            }
            if (!Array.isArray(dataset.pointBorderWidth)) {
                dataset.pointBorderWidth = new Array(dataset.data.length).fill(1);
            }
        }
    });
    
    // Progressive animation timer
    constellationAnimationTimer = setInterval(() => {
        animationProgress += progressPerUpdate;
        
        if (animationProgress >= 100) {
            animationProgress = 100;
            isAnimatingConstellation = false;
            clearInterval(constellationAnimationTimer);
            
            // Trigger the full animation and summary display
            if (currentHoveredChunk === chunkKey && !isShowingSummary) {
                showChunkSummary(chunkKey);
                animateChunkStars(chunkKey);
            }
            return;
        }
        
        // Calculate how many points should be lit based on progress
        const pointsToLight = Math.floor((animationProgress / 100) * totalPoints);
        
        // Light up constellation line progressively
        if (constellationDataset) {
            const lineOpacity = Math.min(0.5, (animationProgress / 100) * 0.5);
            const lineWidth = 1 + (animationProgress / 100); // 1 to 2
            constellationDataset.borderColor = `rgba(255, 255, 255, ${lineOpacity})`;
            constellationDataset.borderWidth = lineWidth;
            
            // Add glow effect
            if (animationProgress > 50) {
                const glowIntensity = (animationProgress - 50) / 50;
                constellationDataset.borderColor = `rgba(255, 255, 255, ${lineOpacity + glowIntensity * 0.2})`;
            }
        }
        
        // Light up points progressively
        for (let i = 0; i < pointsToLight && i < sortedPoints.length; i++) {
            const point = sortedPoints[i];
            
            // Find and animate this point in all datasets
            sentimentChart.data.datasets.forEach(dataset => {
                if (dataset.type === 'scatter' || !dataset.type) {
                    dataset.data.forEach((dataPoint, index) => {
                        if (dataPoint.x === point.x && dataPoint.y === point.y) {
                            // Progressive size increase
                            const sizeFactor = 1 + (i / totalPoints) * 0.5; // Up to 1.5x size
                            dataset.pointRadius[index] = 6 * sizeFactor + Math.sin(animationProgress * 0.1) * 2;
                            dataset.pointBorderWidth[index] = 1 + (i / totalPoints) * 2;
                        }
                    });
                }
            });
        }
        
        sentimentChart.update('none');
    }, updateInterval);
}

// Stop progressive constellation animation
function stopProgressiveConstellation() {
    if (constellationAnimationTimer) {
        clearInterval(constellationAnimationTimer);
        constellationAnimationTimer = null;
    }
    animationProgress = 0;
    isAnimatingConstellation = false;
    
    // Reset constellation appearance
    resetChunkAnimation();
    
    // Remove animation class from chart container
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.classList.remove('animating-constellation');
    }
}

// UI state management
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function showContent() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'flex';
    document.getElementById('error').style.display = 'none';
    
    // Ensure symbol selector is enabled
    const symbolSelector = document.getElementById('symbolSelector');
    if (symbolSelector) {
        symbolSelector.disabled = false;
    }
    
    // Update navigation button states
    updateNavButtonStates();
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
    
    // Ensure symbol selector is enabled even on error
    const symbolSelector = document.getElementById('symbolSelector');
    if (symbolSelector) {
        symbolSelector.disabled = false;
    }
}

// Utility function to format date for API
function formatDateForAPI(date) {
    return date.toISOString();
}

// Load additional chunk and merge with existing data
async function loadAdditionalChunk(chunkIndex) {
    if (isLoadingChunk || chunkIndex < 0 || chunkIndex >= availableChunks.length) {
        return;
    }
    
    const chunk = availableChunks[chunkIndex];
    const chunkKey = `${chunk.chunk_start}-${chunk.chunk_end}`;
    
    // Check if already loaded
    if (loadedChunks.has(chunkKey)) {
        console.log(`Chunk ${chunkKey} already loaded`);
        return;
    }
    
    isLoadingChunk = true;
    
    // Update button states when loading starts
    updateNavButtonStates();
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('chunkLoading');
    const loadingDetail = document.getElementById('chunkLoadingDetail');
    if (loadingIndicator) {
        loadingIndicator.classList.add('active');
        if (loadingDetail) {
            const remainingLoads = 5 - leftButtonClickCount;
            loadingDetail.textContent = `Loading earlier ${TICKER} data (${remainingLoads} loads remaining)`;
        }
    }
    
    try {
        console.log(`Loading additional chunk: ${chunk.chunk_start} to ${chunk.chunk_end}`);
        
        // Fetch reasoning data for this chunk
        const reasoningData = await fetchReasoningData(chunk);
        const processedEvents = processReasoningData(reasoningData, chunk);
        
        if (processedEvents.length > 0) {
            // Fetch summary data for this chunk
            const summaryData = await fetchSummaryData(chunk.chunk_start, chunk.chunk_end);
            if (summaryData) {
                chunkSummaries[chunkKey] = summaryData;
            }
            
            // Update loading detail with processing info
            if (loadingDetail) {
                // Get date range from these events
                const timestamps = processedEvents.map(e => new Date(e.timestamp + 'Z'));
                const minDate = new Date(Math.min(...timestamps));
                const maxDate = new Date(Math.max(...timestamps));
                loadingDetail.textContent = `Processing ${processedEvents.length} events from ${minDate.toLocaleDateString()}`;
            }
            
            // Merge with existing events
            allEventsData = [...allEventsData, ...processedEvents];
            
            // Sort all events by timestamp
            allEventsData.sort((a, b) => new Date(a.timestamp + 'Z') - new Date(b.timestamp + 'Z'));
            
            // Mark chunk as loaded
            loadedChunks.add(chunkKey);
            
            // Get expanded time range
            const timeRange = getTimeRange(allEventsData);
            
            // Update loading detail for market data
            if (loadingDetail) {
                loadingDetail.textContent = `Loading market prices...`;
            }
            
            // Fetch additional market data for the expanded range
            const marketDataResponse = await fetchMarketData(timeRange.start, timeRange.end);
            marketData = marketDataResponse;
            
            // Update chart with all data
            createScatterPlot(allEventsData, marketData);
            
            // Update events list
            displayEvents(allEventsData);
            
            // Update navigation button states
            updateNavButtonStates();
            
            console.log(`Successfully loaded chunk ${chunkKey}, total events: ${allEventsData.length}`);
        }
    } catch (error) {
        console.error('Error loading additional chunk:', error);
    } finally {
        isLoadingChunk = false;
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
        // Update button states
        updateNavButtonStates();
    }
}

// Get chunk index by timestamp
function getChunkIndexForTimestamp(timestamp) {
    const targetTime = new Date(timestamp);
    
    // Find which chunk this timestamp would belong to
    for (let i = availableChunks.length - 1; i >= 0; i--) {
        const chunk = availableChunks[i];
        // This is approximate - we check if we need an earlier chunk
        const chunkKey = `${chunk.chunk_start}-${chunk.chunk_end}`;
        if (!loadedChunks.has(chunkKey)) {
            return i;
        }
    }
    
    return -1; // No more chunks to load
}

// Detect input type based on actual interaction
function updateInputType(type) {
    lastInputType = type;
    
    // Clear any existing timeout
    if (inputTypeTimeout) {
        clearTimeout(inputTypeTimeout);
    }
    
    // Reset to mouse after 500ms of no touch input
    // This handles the case where user switches from touch to mouse
    if (type === 'touch') {
        inputTypeTimeout = setTimeout(() => {
            lastInputType = 'mouse';
        }, 500);
    }
}

// Listen for touch events globally to detect touch input
document.addEventListener('touchstart', () => updateInputType('touch'), { passive: true });
document.addEventListener('touchmove', () => updateInputType('touch'), { passive: true });
document.addEventListener('touchend', () => updateInputType('touch'), { passive: true });

// Listen for mouse events to detect mouse input
document.addEventListener('mousemove', (e) => {
    // Only count as mouse if there's actual movement (not triggered by touch)
    if (e.movementX !== 0 || e.movementY !== 0) {
        updateInputType('mouse');
    }
}, { passive: true });