# SentiMove

A cutting-edge cryptocurrency market sentiment analysis platform featuring an immersive 3D space visualization and real-time intelligence dashboard with unique constellation-based data visualization.

## Project Structure

```
sentimove.com/
├── index.html              # Main landing page with 3D space visualization
├── intelligence.html       # Real-time crypto sentiment analysis dashboard
├── favicon.svg            # Site favicon
├── .htaccess              # Server configuration
├── README.md              # This file
├── assets/
│   ├── css/
│   │   ├── styles.css         # Styles for main landing page
│   │   └── intelligence.css   # Styles for intelligence dashboard
│   └── js/
│       ├── main.js            # 3D visualization logic using Three.js
│       └── intelligence.js    # Sentiment analysis dashboard logic
└── .github/               # GitHub configuration

```

## Features

### Landing Page (index.html)
- **3D Space Visualization**: Interactive cosmic environment using Three.js
- **Telescope Frame Effect**: Immersive viewing experience
- **Navigation**: Quick access to the Intelligence dashboard

### Intelligence Dashboard (intelligence.html)
- **Real-Time Sentiment Analysis**: Track cryptocurrency market sentiment powered by AI
- **Multi-Currency Support**: Monitor sentiment for BTC, ETH, SOL, XRP, ADA, AVAX, DOGE, TRX, LINK, and DOT
- **Interactive Constellation Visualization**: Unique star-based sentiment event display
- **Event Tracking**: View recent market events affecting sentiment
- **SentiChain API Integration**: Real-time data from the SentiChain sentiment analysis API

## Constellation Visualization

The Intelligence dashboard features a unique constellation-based visualization where each sentiment event is represented as a star in space:

### Star Types & Colors
- **Macro Events** (Red Stars): Major economic and global events
- **Industry Events** (Cyan Stars): Cryptocurrency industry-specific news
- **Price Events** (Yellow Stars): Significant price movements
- **Asset Events** (Green Stars): Individual asset-related events

### Interaction Features

#### Desktop Interactions
- **Hover over a star**: Highlights the corresponding event in the left panel
- **Click a star**: Persistently highlights the event details
- **Hover for 2 seconds**: Triggers progressive constellation animation showing connections between related events
- **After animation completes**: Displays a comprehensive summary of all events in that time chunk

#### Mobile Interactions
- **Quick tap a star**: Highlights the corresponding event (stays visible for 3 seconds)
- **Long press a star** (0.5 seconds): 
  - Shows visual ripple feedback
  - Triggers haptic feedback (if supported)
  - Starts progressive constellation animation
  - Displays chunk summary after animation

### Progressive Constellation Animation
When triggered, the visualization:
1. Gradually connects stars within the same time period
2. Stars pulse and grow brighter sequentially
3. Constellation lines fade in progressively
4. Creates a "connecting the dots" effect revealing patterns
5. Culminates in displaying a comprehensive AI-generated summary

### Historical Data Navigation
- **Load Earlier Data**: Navigate through up to 5 historical data chunks
- **Chunk System**: Data is organized in time-based chunks for efficient loading
- **Progressive Loading**: Additional data loads seamlessly without disrupting the view

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **3D Graphics**: Three.js with CSS2DRenderer
- **Data Visualization**: Chart.js with custom star-based scatter plot
- **Animations**: CSS animations and JavaScript-based progressive effects
- **API**: SentiChain API for sentiment data
- **SEO**: Comprehensive meta tags and structured data
- **Mobile**: Touch-optimized with haptic feedback support

## Getting Started

1. Clone the repository or download the files
2. Ensure your web server has proper MIME types configured (see .htaccess)
3. Obtain a SentiChain API key from [https://sentichain.com](https://sentichain.com)
4. Open `index.html` in a modern web browser
5. Navigate to the Intelligence dashboard
6. Enter your API key when prompted (it will be saved locally)

## Browser Requirements

- Modern web browser with WebGL support for 3D visualization
- JavaScript enabled
- Internet connection for loading external libraries and API data
- Touch support for mobile interactions
- Local storage enabled for API key persistence

## Mobile Optimization

The platform is fully responsive with specific optimizations for mobile devices:
- Touch-friendly interface with appropriate tap targets
- Gesture support for constellation interactions
- Optimized performance with reduced visual effects on mobile
- iOS viewport handling for proper full-screen experience
- Safe area support for devices with notches

## License

SentiMove © All Rights Reserved 2025 
