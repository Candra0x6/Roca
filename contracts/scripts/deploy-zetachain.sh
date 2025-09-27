#!/bin/bash

# ZetaChain Athens 3 Testnet Deployment Script
# This script deploys all contracts to ZetaChain Athens 3 testnet

echo "🌟 ZetaChain Athens 3 Testnet Deployment"
echo "========================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create one with:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
    exit 1
fi

# Load environment variables
source .env

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env file"
    exit 1
fi

echo "🔄 Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "🚀 Deploying to ZetaChain Athens 3 testnet..."
npx hardhat run scripts/deploy-zetachain.ts --network zetachain

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Fund the YieldManager with aZETA"
    echo "2. Test the deployment with frontend"
    echo "3. Verify contracts on ZetaScan"
    echo ""
    echo "🔗 Useful links:"
    echo "- ZetaScan Explorer: https://athens3.zetascan.io"
    echo "- Get aZETA: https://labs.zetachain.com/get-zeta"
else
    echo "❌ Deployment failed"
    exit 1
fi