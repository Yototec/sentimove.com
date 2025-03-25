# SentiMove - Secure Backend-Frontend Architecture

SentiMove is an interactive 3D visualization of blockchain sentiment data. This application uses a secure backend-frontend architecture to protect proprietary code and algorithms from being copied.

## Project Structure

```
sentimove.com/
├── public/                   # Frontend static files
│   ├── assets/
│   │   ├── css/
│   │   │   └── styles.css    # Frontend styles
│   │   └── js/
│   │       └── app.js        # Frontend JavaScript
│   ├── index.html            # Main HTML file
│   └── favicon.svg           # Favicon
├── server/                   # Backend server
│   ├── config/               # Server configuration
│   ├── controllers/          # API controllers
│   │   └── dataController.js # Data processing logic
│   ├── routes/               # API routes
│   │   └── api.js            # API endpoints
│   ├── .env                  # Environment variables (not in version control)
│   ├── .gitignore            # Git ignore file
│   ├── package.json          # Node.js dependencies
│   └── server.js             # Main server file
└── README.md                 # Project documentation
```

## Security Features

- **Server-side data processing**: Proprietary algorithms run on the server, not in the browser
- **API authentication**: Restricted access to the data API
- **Rate limiting**: Prevents abuse through too many API requests
- **CORS protection**: Controls which domains can access the API
- **Helmet security headers**: Protects against common web vulnerabilities

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your settings:
   ```
   PORT=3000
   NODE_ENV=development
   SENTICHAIN_API_KEY=your_api_key_here
   ```

4. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup

In development, you can serve the frontend using any static file server. For example:

1. Install a simple static file server:
   ```
   npm install -g http-server
   ```

2. Navigate to the public directory:
   ```
   cd public
   ```

3. Start the server:
   ```
   http-server -p 8080
   ```

4. Open your browser at http://localhost:8080

### Full Stack Development

For convenient development of both frontend and backend simultaneously:

1. From the root directory, install all dependencies:
   ```
   npm run install-all
   ```

2. Start both servers with a single command:
   ```
   npm run dev
   ```

This will start the backend server on port 3000 and the frontend server on port 8080.

## Production Deployment

For production, the Express server is configured to serve the static frontend files directly.

1. Set environment to production in `.env`:
   ```
   NODE_ENV=production
   ```

2. Build or copy your frontend files to the `public` directory

3. Start the server:
   ```
   npm start
   ```

Your application will now be available on the configured port, serving both the API and frontend from a single server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Keep proprietary algorithms in the server's controllers
- Frontend code should only handle UI and data visualization
- Use the API service in app.js for all data fetching
- Follow the existing code style and patterns
- Add comments for complex logic

## Deployment

### Server Deployment

1. Set up a Node.js hosting environment (e.g., AWS, Heroku, DigitalOcean)
2. Clone the repository to your server
3. Install dependencies with `npm install`
4. Set up your environment variables in a `.env` file
5. Use a process manager like PM2 to run the server:
   ```
   npm install -g pm2
   pm2 start server/server.js
   ```

### Alternative Deployment Options

- Use Docker containers
- Deploy on serverless platforms (AWS Lambda, Vercel, etc.)
- Set up CI/CD pipelines with GitHub Actions

## License

SentiMove - All Rights Reserved 2025 
