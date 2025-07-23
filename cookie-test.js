const { editImageWithPlaywright } = require('./imageEditor');

/**
 * Test the image editor with cookies
 */
async function testWithCookies() {
  console.log('Starting cookie authentication test...');
  
  // Sample image URL and prompt
  const imageUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8MXx8fGVufDB8fHx8&w=1000&q=80';
  const prompt = 'Make this image more vibrant';
  
  try {
    console.log('Checking if cookie file exists...');
    const fs = require('fs');
    const path = require('path');
    const cookieFile = path.resolve(__dirname, 'playground.bfl.ai_cookies.txt');
    
    if (!fs.existsSync(cookieFile)) {
      console.error(`Cookie file not found at: ${cookieFile}`);
      console.log('Please ensure the cookie file is in the correct location.');
      return;
    }
    
    console.log(`Cookie file found at: ${cookieFile}`);
    console.log('Calling editImageWithPlaywright...');
    
    // Run the image editor with cookies
    const result = await editImageWithPlaywright(imageUrl, prompt);
    
    // Check if the result contains the expected properties
    console.log('Test result:', {
      status: result.status,
      hasResultImageUrl: !!result.resultImageUrl,
      hasScreenshot: !!result.screenshot,
    });
    
    // Log the result image URL
    console.log('Result image URL:', result.resultImageUrl);
    
    console.log('Cookie authentication test completed successfully!');
  } catch (error) {
    console.error('Cookie authentication test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testWithCookies();