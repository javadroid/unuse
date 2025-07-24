# PowerShell script to set up and run the Image Edit Service

# Display welcome message
Write-Host "\nImage Edit Service Setup" -ForegroundColor Cyan
Write-Host "=====================\n" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js before continuing." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "\nInstalling dependencies..." -ForegroundColor Cyan
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing dependencies. Please check the error messages above." -ForegroundColor Red
    exit 1
}

# Install Playwright
Write-Host "\nInstalling Playwright..." -ForegroundColor Cyan
pnpm run setup

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing Playwright. Please check the error messages above." -ForegroundColor Red
    exit 1
}

# Check for cookie file
Write-Host "\nChecking for cookie file..." -ForegroundColor Cyan
$cookieFile = "playground.bfl.ai_cookies.txt"

if (Test-Path $cookieFile) {
    Write-Host "Cookie file found!" -ForegroundColor Green
} else {
    Write-Host "Cookie file not found. The service may not work correctly without authentication." -ForegroundColor Yellow
    Write-Host "Please place the file 'playground.bfl.ai_cookies.txt' in the project root directory." -ForegroundColor Yellow
}

# Success message
Write-Host "\nSetup completed successfully!" -ForegroundColor Green
Write-Host "\nTo start the server, run: pnpm start" -ForegroundColor Yellow
Write-Host "Then access the web interface at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "\nTo run tests: pnpm test" -ForegroundColor Yellow
Write-Host "To test cookie authentication: pnpm run cookie-test" -ForegroundColor Yellow
Write-Host "To run the example client: pnpm run example" -ForegroundColor Yellow

# Ask if user wants to start the server now
$startServer = Read-Host "\nDo you want to start the server now? (y/n)"


Write-Host "\nStarting server..." -ForegroundColor Cyan
pnpm start
