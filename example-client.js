const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Example client for the image edit service
 */
async function runExample() {
  try {
    // Replace with your actual image URL and prompt
    const requestData = {
      imageUrl: 'https://example.com/your-image.jpg',
      prompt: 'Make the background blue and add sparkles'
    };

    console.log('Sending request to edit image...');
    
    // Send request to the API
    const response = await axios.post('http://localhost:3000/edit-image', requestData);
    
    console.log('Response received!');
    console.log('Status:', response.data.status);
    console.log('Result image URL:', response.data.resultImageUrl);
    
    // Save the screenshot to a file
    if (response.data.screenshot) {
      // Extract the base64 data
      const base64Data = response.data.screenshot.replace(/^data:image\/jpeg;base64,/, '');
      
      // Create the output directory if it doesn't exist
      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      
      // Write the file
      const outputPath = path.join(outputDir, 'edited-image-result.jpg');
      fs.writeFileSync(outputPath, base64Data, 'base64');
      
      console.log('Screenshot saved to:', outputPath);
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Run the example
runExample();