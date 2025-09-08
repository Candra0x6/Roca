#!/bin/bash

# Somnia Testnet Deployment Script
# This script deploys PoolFactory and YieldManager to Somnia testnet

echo "🌟 Somnia Testnet Deployment"
echo "============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "SOMNIA_RPC_URL=https://testnet.somnia.network"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  Warning: PRIVATE_KEY not found in environment"
    echo "Make sure it's set in your .env file"
fi

# Compile contracts first
echo "📦 Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✅ Contracts compiled successfully!"

# Deploy to Somnia testnet
echo "🚀 Deploying to Somnia testnet..."
npx hardhat run scripts/deploy-somnia.ts --network somnia

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check the deployment output for contract addresses"
    echo "2. Verify contracts on Somnia explorer if needed"
    echo "3. Update your frontend configuration"
    echo "4. Test the deployment"
else
    echo "❌ Deployment failed!"
    echo ""
    echo "💡 Common solutions:"
    echo "1. Check your PRIVATE_KEY in .env"
    echo "2. Ensure you have testnet ETH in your account"
    echo "3. Verify SOMNIA_RPC_URL is correct"
    echo "4. Check network connectivity"
    exit 1
fi
