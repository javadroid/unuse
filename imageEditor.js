const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS === 'true';
const TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000', 10);
const COOKIE_FILE = path.resolve(__dirname, 'playground.bfl.ai_cookies.txt');

/**
 * Parse Netscape cookie file format
 * @param {string} cookieFilePath - Path to the cookie file
 * @returns {Array} - Array of cookie objects
 */
function parseCookieFile(cookieFilePath) {
  if (!fs.existsSync(cookieFilePath)) {
    console.warn(`Cookie file not found: ${cookieFilePath}`);
    return [];
  }

  const content = fs.readFileSync(cookieFilePath, 'utf8');
  const lines = content.split('\n');
  const cookies = [];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') {
      continue;
    }

    // Parse cookie line
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const [domain, flag, path, secure, expiration, name, value] = parts;
      
      cookies.push({
        name,
        value,
        domain: domain.startsWith('.') ? domain.substring(1) : domain,
        path,
        expires: expiration === 'FALSE' ? -1 : parseInt(expiration, 10),
        httpOnly: false,
        secure: secure === 'TRUE',
        sameSite: 'Lax'
      });
    }
  }

  console.log(`Parsed ${cookies.length} cookies from ${cookieFilePath}`);
  return cookies;
}

/**
 * Edits an image using the BFL AI playground
 * @param {string} imageUrl - URL of the image to edit
 * @param {string} prompt - Text prompt for editing the image
 * @returns {Object} - Object containing the edited image URL and status
 */
async function editImageWithPlaywright(imageUrl, prompt) {
  console.log(`Starting image edit process with prompt: "${prompt}"`);
  console.log(`Image URL: ${imageUrl}`);
  
  // Launch a new browser instance
  const browser = await chromium.launch({ 
    headless: HEADLESS,
    timeout: TIMEOUT
  });
  let page;
  
  try {
    // Create a new context and add cookies
    const context = await browser.newContext();
    
    // Load and parse cookies from the cookie file
    const cookies = parseCookieFile(COOKIE_FILE);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      console.log('Added authentication cookies to browser context');
    } else {
      console.warn('No cookies loaded, authentication may fail');
    }
    
    // Create a new page from the context with cookies
    page = await context.newPage();
    
    // Navigate to the BFL AI playground with enhanced error handling
    console.log('Navigating to BFL AI playground...');
    try {
      const response = await page.goto('https://playground.bfl.ai/image/edit', { 
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });
      
      if (response) {
        console.log(`Navigation complete. Status: ${response.status()}`);
      } else {
        console.log('Navigation complete but no response object returned');
      }
      
      // Check if we're on the correct page
      const url = page.url();
      console.log(`Current page URL: ${url}`);
      
      if (!url.includes('playground.bfl.ai')) {
        console.warn('Warning: Navigation may have been redirected to a different domain');
      }
    } catch (navError) {
      console.error(`Navigation error: ${navError.message}`);
      throw navError; // Re-throw to be caught by the main try/catch
    }
    
    console.log('Navigated to BFL AI playground');
    
    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    
    // The BFL AI playground uses a drag and drop interface for images
    // We need to set the image URL directly using JavaScript
    await page.evaluate((url) => {
      // Create a custom event to simulate file drop with a URL
      const dataTransfer = new DataTransfer();
      const file = new File([''], 'image.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'path', { value: url });
      dataTransfer.items.add(file);
      
      // Find the drop zone element
      const dropZone = document.querySelector('.drop-zone') || 
                      document.querySelector('[data-testid="drop-zone"]') || 
                      document.querySelector('[role="button"][aria-label*="drop"]');
      
      if (dropZone) {
        // Create and dispatch drop event
        const dropEvent = new DragEvent('drop', { dataTransfer });
        dropZone.dispatchEvent(dropEvent);
      } else {
        // If drop zone not found, try to find an input field or set a global variable
        console.error('Drop zone not found, trying alternative methods');
        // Set a global variable that might be used by the application
        window.__imageUrl = url;
      }
    }, imageUrl);
    
    console.log('Set image URL using JavaScript injection');
    
    // Wait for the image to be loaded
    await page.waitForTimeout(2000);
    
    // Look for the prompt input field
    try {
      // Try different selectors for the prompt input
      const promptInput = await page.waitForSelector(
        'textarea[placeholder*="Describe"], textarea[placeholder*="change"], input[type="text"][placeholder*="Describe"], [role="textbox"]',
        { timeout: 5000 }
      );
      await promptInput.fill(prompt);
      console.log('Filled prompt');
    } catch (error) {
      console.warn(`Could not find prompt input: ${error.message}`);
      // Try to inject the prompt using JavaScript
      await page.evaluate((promptText) => {
        // Try to find any visible input or textarea
        const inputs = Array.from(document.querySelectorAll('textarea, input[type="text"], [role="textbox"]'))
          .filter(el => el.offsetParent !== null); // Only visible elements
        
        if (inputs.length > 0) {
          // Focus and set value on the first visible input
          inputs[0].focus();
          inputs[0].value = promptText;
          // Trigger input event
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Set prompt via JavaScript injection');
        } else {
          console.error('No visible input fields found');
        }
      }, prompt);
    }
    
    // Find and click the submit/generate button
    try {
      // Try different selectors for the submit button
      const submitButton = await page.waitForSelector(
        'button:has-text("Generate"), button:has-text("Edit"), button:has-text("Submit"), button:has-text("Apply"), button[aria-label*="edit"], button[aria-label*="generate"]',
        { timeout: 5000 }
      );
      await submitButton.click();
      console.log('Clicked submit button');
    } catch (error) {
      console.warn(`Could not find submit button: ${error.message}`);
      // Try to find and click any button that might be the submit button
      await page.evaluate(() => {
        // Look for buttons with relevant text or attributes
        const buttons = Array.from(document.querySelectorAll('button'))
          .filter(btn => {
            const text = btn.textContent.toLowerCase();
            return (text.includes('edit') || text.includes('generate') || 
                   text.includes('apply') || text.includes('submit')) &&
                   btn.offsetParent !== null; // Only visible buttons
          });
        
        if (buttons.length > 0) {
          buttons[0].click();
          console.log('Clicked button via JavaScript injection');
        } else {
          console.error('No suitable buttons found');
        }
      });
    }
    
    // Wait for the result to be generated
    console.log('Waiting for result image...');
    
    // Wait for loading indicators to disappear
    try {
      // Look for loading indicators and wait for them to disappear
      const loadingSelector = '[role="progressbar"], .loading, .spinner, [aria-busy="true"]';
      if (await page.$(loadingSelector) !== null) {
        console.log('Detected loading indicator, waiting for it to disappear...');
        await page.waitForSelector(loadingSelector, { state: 'detached', timeout: TIMEOUT });
      }
    } catch (loadingError) {
      console.warn(`Loading indicator handling error: ${loadingError.message}`);
      // Continue anyway as the loading indicator might not be present
    }
    
    // Wait additional time for the result to appear
    await page.waitForTimeout(5000);
    
    // Try to find the result image using various selectors
    let resultImageElement = null;
    let resultImageUrl = null;
    
    // Try multiple selectors to find the result image
    const imageSelectors = [
      'img[src*="output"]', 
      'img[alt*="result"]', 
      'img[alt*="edited"]',
      'img[alt*="output"]',
      'img:not([alt=""]):not([src*="data:"])',  // Any non-empty image that's not a data URL
      'canvas',  // Some sites render to canvas
      '[role="img"]'  // Accessibility role
    ];
    
    for (const selector of imageSelectors) {
      try {
        resultImageElement = await page.$(selector);
        if (resultImageElement) {
          console.log(`Found result image with selector: ${selector}`);
          
          // Try to get the image URL
          if (selector.includes('img')) {
            resultImageUrl = await resultImageElement.getAttribute('src');
          } else if (selector.includes('canvas')) {
            // For canvas elements, we'll capture them in the screenshot
            resultImageUrl = 'canvas-element';
          } else {
            resultImageUrl = 'element-found-but-no-src';
          }
          
          break;
        }
      } catch (selectorError) {
        console.warn(`Error with selector ${selector}: ${selectorError.message}`);
      }
    }
    
    // If we still couldn't find the image, try JavaScript evaluation
    if (!resultImageElement) {
      console.log('Trying to find images using JavaScript evaluation...');
      
      // Use JavaScript to find all images on the page
      const imageInfo = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter(img => {
            // Filter out tiny images, data URLs, and images without src
            const rect = img.getBoundingClientRect();
            return img.src && 
                   !img.src.startsWith('data:') && 
                   rect.width > 100 && 
                   rect.height > 100 && 
                   img.offsetParent !== null; // Only visible images
          })
          .map(img => ({
            src: img.src,
            width: img.width,
            height: img.height,
            alt: img.alt || ''
          }));
      });
      
      console.log(`Found ${imageInfo.length} potential result images via JavaScript`);
      
      // If we found any images, use the last one (assuming it's the result)
      if (imageInfo.length > 0) {
        resultImageUrl = imageInfo[imageInfo.length - 1].src;
        console.log(`Using image URL: ${resultImageUrl}`);
      }
    }
    
    // Take a screenshot of the result
    console.log('Taking screenshot of the result...');
    const screenshot = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 90 });
    const screenshotBase64 = screenshot.toString('base64');
    
    // If we couldn't find a result image URL, we'll still return the screenshot
    if (!resultImageUrl) {
      console.log('No result image URL found, but returning screenshot');
      return {
        status: 'partial_success',
        message: 'Could not find result image URL, but screenshot was taken',
        resultImageUrl: null,
        screenshot: `data:image/jpeg;base64,${screenshotBase64}`
      };
    }
    
    console.log('Image editing completed successfully');
    return {
      status: 'success',
      resultImageUrl,
      screenshot: `data:image/jpeg;base64,${screenshotBase64}`
    };
  } catch (error) {
    console.error('Error during image editing:', error);
    
    // Take a screenshot of the error state if possible
    let errorScreenshot = null;
    if (page) {
      try {
        const screenshot = await page.screenshot({ fullPage: true });
        errorScreenshot = `data:image/png;base64,${screenshot.toString('base64')}`;
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
    }
    
    throw new Error(`Failed to edit image: ${error.message}`);
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}

module.exports = { editImageWithPlaywright };