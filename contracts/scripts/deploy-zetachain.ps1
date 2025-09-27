# ZetaChain Athens 3 Testnet Deployment Script (PowerShell)
# This script deploys all contracts to ZetaChain Athens 3 testnet

Write-Host "🌟 ZetaChain Athens 3 Testnet Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found! Please create one with:" -ForegroundColor Red
    Write-Host "PRIVATE_KEY=your_private_key_here" -ForegroundColor Yellow
    Write-Host "ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🔄 Compiling contracts..." -ForegroundColor Blue
npx hardhat compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compilation failed" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying to ZetaChain Athens 3 testnet..." -ForegroundColor Blue
npx hardhat run scripts/deploy-zetachain.ts --network zetachain

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Fund the YieldManager with aZETA" -ForegroundColor White
    Write-Host "2. Test the deployment with frontend" -ForegroundColor White
    Write-Host "3. Verify contracts on ZetaScan" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Useful links:" -ForegroundColor Cyan
    Write-Host "- ZetaScan Explorer: https://athens3.zetascan.io" -ForegroundColor Blue
    Write-Host "- Get aZETA: https://labs.zetachain.com/get-zeta" -ForegroundColor Blue
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above for troubleshooting" -ForegroundColor Yellow
    exit 1
}