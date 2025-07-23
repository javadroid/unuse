const { editImageWithPlaywright } = require('./imageEditor');

/**
 * Test script for the image editor functionality
 */
async function runTest() {
  try {
    console.log('Starting test of image editor...');
    
    // Use a sample image URL and prompt
    // Replace with an actual image URL for testing
    const imageUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8MXx8fGVufDB8fHx8&w=1000&q=80';
    const prompt = 'Make the colors more vibrant';
    
    console.log(`Testing with image: ${imageUrl}`);
    console.log(`Prompt: ${prompt}`);
    
    // Run the image editor function
    const result = await editImageWithPlaywright(imageUrl, prompt);
    
    console.log('Test completed successfully!');
    console.log('Result:', result);
    
    // Check if the result contains the expected properties
    if (result.status === 'success' && result.resultImageUrl && result.screenshot) {
      console.log('✅ Test PASSED: All expected properties are present');
    } else {
      console.log('❌ Test FAILED: Missing expected properties');
      console.log('Expected properties: status, resultImageUrl, screenshot');
      console.log('Received:', Object.keys(result).join(', '));
    }
  } catch (error) {
    console.error('❌ Test FAILED with error:', error.message);
  }
}

// Run the test
runTest();