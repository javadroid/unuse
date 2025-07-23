# Image Edit Service

A Node.js service that uses Playwright to automate image editing on the BFL AI playground (https://playground.bfl.ai/image/edit) with cookie-based authentication.

## Features

- RESTful API endpoint for image editing
- Automated browser interaction using Playwright
- Cookie-based authentication for accessing restricted features
- Takes an image URL and editing prompt as input
- Returns the edited image URL and a screenshot

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

### Option 1: Using the Setup Script (Windows)

Run the PowerShell setup script which will install all dependencies and guide you through the setup process:

```powershell
.\setup.ps1
```

### Option 2: Manual Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npm run setup
```

## Usage

1. Ensure you have the cookie file `playground.bfl.ai_cookies.txt` in the project root directory.

2. Start the server:

```bash
npm start
```

3. Access the web interface by opening a browser and navigating to:

```
http://localhost:3000
```

4. Run the test script to verify functionality:

```bash
npm test
```

5. Test cookie authentication:

```bash
npm run cookie-test
```

6. Run the example client:

```bash
npm run example
```

5. Send a POST request to the `/edit-image` endpoint with the following JSON body:

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "Your editing instructions here"
}
```

5. The server will return a JSON response with:
   - `status`: Success or failure status
   - `resultImageUrl`: URL of the edited image (if successful)
   - `screenshot`: Base64-encoded screenshot of the result

## API Endpoints

### POST /edit-image

Edits an image using the BFL AI playground.

**Request Body:**

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "Make the background blue"
}
```

**Response:**

```json
{
  "status": "success",
  "resultImageUrl": "https://playground.bfl.ai/output/...",
  "screenshot": "data:image/jpeg;base64,..."
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok"
}
```

## Cookie Authentication

This service uses cookie-based authentication to access the BFL AI playground. The cookies are loaded from a file named `playground.bfl.ai_cookies.txt` in the Netscape cookie file format.

### Testing Cookie Authentication

To test if the cookie authentication is working correctly, run:

```bash
npm run cookie-test
```

This will attempt to edit an image using the provided cookies and display the results.

## Notes

- The service uses a non-headless browser by default to ensure proper rendering. You can change this in the `.env` file.
- The selectors in the Playwright automation might need adjustment based on changes to the BFL AI playground website.
- For production use, consider adding additional security measures and rate limiting.
- The cookie file must be in the Netscape cookie file format (as exported by browser extensions or tools like curl).