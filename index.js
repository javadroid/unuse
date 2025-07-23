const express = require('express');
const cors = require('cors');
const path = require('path');
const { editImageWithPlaywright } = require('./imageEditor');
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure request timeout
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '300000', 10); // 5 minutes default

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure timeout middleware
const timeoutMiddleware = (req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT, () => {
    console.error('Request timeout exceeded');
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout exceeded' });
    }
  });
  next();
};

// Main endpoint for image editing
app.post('/edit-image', timeoutMiddleware, async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    
    // Validate inputs
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Processing image edit request: URL=${imageUrl.substring(0, 50)}..., Prompt="${prompt}"`);
    
    // Process the image editing with timeout handling
    const editPromise = editImageWithPlaywright(imageUrl, prompt);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Image editing timed out after ${REQUEST_TIMEOUT}ms`));
      }, REQUEST_TIMEOUT - 5000); // 5 seconds buffer for cleanup
    });
    
    // Race the promises
    const result = await Promise.race([editPromise, timeoutPromise]);
    
    console.log(`Image editing completed with status: ${result.status}`);
    
    // Return the result
    return res.json({
      ...result,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing image edit:', error);
    return res.status(500).json({ 
      error: 'Failed to process image edit', 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Headless mode: ${process.env.PLAYWRIGHT_HEADLESS || 'false'}`);
});