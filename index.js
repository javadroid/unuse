const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

// Load cookies from file
async function parseCookiesFile(filePath) {
    console.log(filePath)
  try {
    const content =  fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cookies = [];

    for (const line of lines) {
      // Skip comments, empty lines and invalid lines
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }

      const parts = line.split('\t');
      // Check if we have all required parts
      if (parts.length >= 7) {
        const [domain, hostOnly, path, secure, expiry, name, value] = parts;
        
        // Skip invalid entries
        if (!domain || !name || !value) {
          continue;
        }

        cookies.push({
          name: name,
          value: value,
          domain: domain.startsWith('.') ? domain : `.${domain}`,
          path: path,
          expires: expiry ? Number(expiry) : undefined,
          secure: secure.toUpperCase() === 'TRUE',
          sameSite: 'Lax',
          httpOnly: hostOnly.toUpperCase() === 'TRUE'
        });
      }
    }

    console.log(`Parsed ${cookies.length} cookies from file`);
    return cookies;
  } catch (error) {
    console.error('Error parsing cookies file:', error);
    throw new Error(`Failed to parse cookies file: ${error.message}`);
  }
}
// Download image from URL
async function downloadImage(imageUrl, filepath) {
  const response = await axios({
    url: imageUrl,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Wait for element with retry
async function waitForElementWithRetry(page, selector, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      return true;
    } catch (error) {
      await page.waitForTimeout(1000);
    }
  }
  throw new Error(`Element ${selector} not found after ${timeout}ms`);
}

app.post("/edit-image", async (req, res) => {
  const { imageUrl, prompt } = req.body;

  if (!imageUrl || !prompt) {
    return res.status(400).json({
      error: "Missing required parameters: imageUrl and prompt",
    });
  }

  let browser;
  let imagePath;

  try {
    console.log("Starting image editing process...");

    // Download the image
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    imagePath = path.join(tempDir, `input_${Date.now()}.jpg`);
    await downloadImage(imageUrl, imagePath);
    console.log("Image downloaded successfully");

    // Launch browser
    browser = await chromium.launch({
      headless: false, // Set to true for production

      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
 const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });


  let page;

    // Load and parse cookies from file
    console.log('Loading cookies from file...');
    const cookies = await parseCookiesFile('playground.bfl.aicookies.txt');
    console.log(`Adding ${cookies.length} cookies to browser context...`);
    
    // Add the cookies to the context
    await context.addCookies(cookies);

    page = await context.newPage();
     console.log("Navigating to BFL playground...");
    await page.goto("https://playground.bfl.ai/image/edit", {
      waitUntil: "networkidle",
      timeout: 600000,
    });
   
    // Wait for page to load
    // await page.waitForTimeout(3000);

    // Look for file input or upload button
    console.log("Looking for upload elements...");

    // Try different selectors for file upload
    const uploadSelectors = [
      'input[type="file"]',
      '[data-testid="file-upload"]',
      ".upload-button",
      '[accept*="image"]',
      'input[accept*="image/*"]',
    ];

    let fileInput;
    for (const selector of uploadSelectors) {
      try {
        fileInput = await page.$(selector);
        if (fileInput) {
          console.log(`Found file input with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!fileInput) {
      // Try to find upload area by clicking
      const uploadAreaSelectors = [
        ".upload-area",
        ".dropzone",
        '[role="button"]:has-text("upload")',
        'button:has-text("Upload")',
        'div:has-text("upload")',
        'div:has-text("drag")',
      ];

      for (const selector of uploadAreaSelectors) {
        try {
          const uploadArea = await page.$(selector);
          if (uploadArea) {
            await uploadArea.click();
            await page.waitForTimeout(1000);
            fileInput = await page.$('input[type="file"]');
            if (fileInput) break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    if (!fileInput) {
      throw new Error(
        "Could not find file upload input. Page structure might have changed."
      );
    }

    // Upload the file
    console.log("Uploading image...");
    await fileInput.setInputFiles(imagePath);

    // Wait for upload to complete
    await page.waitForTimeout(5000);

    // Look for prompt input field
    console.log("Looking for prompt input...");
     const promptSelectors = [
            '#edit-image-prompt-input',
            'input[placeholder*="Describe what you want to change"]',
            'input[placeholder*="describe"]',
            'input[placeholder*="change"]',
            'textarea[placeholder*="prompt"]',
            'input[placeholder*="prompt"]',
            'textarea[placeholder*="describe"]',
            'textarea',
            '.prompt-input',
            '[data-testid="prompt-input"]'
        ];

    let promptInput;
    for (const selector of promptSelectors) {
      try {
        promptInput = await page.$(selector);
        if (promptInput) {
          console.log(`Found prompt input with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!promptInput) {
      throw new Error("Could not find prompt input field");
    }

    // Enter the prompt
    console.log("Entering prompt...");
    await promptInput.click();
    await promptInput.fill(prompt);

    // Look for and click the generate/edit button
    console.log("Looking for generate button...");
      const buttonSelectors = [
            // Target the specific button with arrow-right icon
            'button:has(.lucide-arrow-right)',
            'button:has(svg[class*="arrow-right"])',
            'button .lucide-arrow-right',
            'button svg[class*="arrow-right"]',
            // Fallback to general button patterns
            'button:has-text("Generate")',
            'button:has-text("Edit")',
            'button:has-text("Create")',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button[type="submit"]',
            '[data-testid="generate-button"]',
            '[data-testid="edit-button"]',
            '.generate-button',
            '.edit-button',
            // Look for buttons with common generate/edit classes
            '[class*="generate"]',
            '[class*="submit"]',
            // Target button by its styling classes
            'button.bg-primary',
            'button[class*="bg-primary"]'
        ];

    let generateButton;
    for (const selector of buttonSelectors) {
      try {
        generateButton = await page.$(selector);
        if (generateButton && (await generateButton.isEnabled())) {
          console.log(`Found generate button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!generateButton) {
      throw new Error("Could not find generate button");
    }

    // Click generate button
    console.log("Clicking generate button...");
    await generateButton.click();

    // Wait for results
    console.log("Waiting for results...");
    await page.waitForTimeout(5000);

    // Wait for images to be generated
    const resultSelectors = [
      'img[src*="generated"]',
      ".result-image",
      ".output-image",
      '[data-testid="result-image"]',
      'img[src*="bfl"]',
    ];

    let resultImages = [];
    const maxWaitTime = 120000; // 2 minutes timeout
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime && resultImages.length === 0) {
      for (const selector of resultSelectors) {
        try {
          const images = await page.$$(selector);
          if (images.length > 0) {
            console.log(`Found ${images.length} result images`);
            for (const img of images) {
              const src = await img.getAttribute("src");
              if (src && src !== imagePath && !src.includes("data:")) {
                resultImages.push(src);
              }
            }
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (resultImages.length === 0) {
        await page.waitForTimeout(3000);
      }
    }

    if (resultImages.length === 0) {
      // Try to get any images from the page
      const allImages = await page.$$eval("img", (imgs) =>
        imgs
          .map((img) => img.src)
          .filter(
            (src) => src && !src.startsWith("data:") && src.includes("http")
          )
      );

      resultImages = allImages.filter(
        (src) => !src.includes("logo") && !src.includes("icon")
      );
    }

    console.log(`Found ${resultImages.length} result images`);

    // Return the results
    res.json({
      success: true,
      message: "Image editing completed",
      originalImage: imageUrl,
      prompt: prompt,
      resultImages: resultImages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during image editing:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
    }

    // Delete temporary image file
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BFL Image Editor API running on port ${PORT}`);
  console.log(
    `Usage: POST /edit-image with { "imageUrl": "...", "prompt": "..." }`
  );
});

module.exports = app;
