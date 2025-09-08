#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Roca Development Deployment Script${NC}"
echo "=============================================="

# Change to contracts directory
cd "$(dirname "$0")" || exit 1

# Check if hardhat node is running
echo -e "${YELLOW}📡 Checking if Hardhat node is running...${NC}"
if ! curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 > /dev/null 2>&1; then
  echo -e "${RED}❌ Hardhat node is not running!${NC}"
  echo -e "${YELLOW}Please start it first with: npx hardhat node${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Hardhat node is running${NC}"

# Deploy contracts
echo -e "${YELLOW}📦 Deploying contracts...${NC}"
npx hardhat run scripts/deploy-dev.ts --network localhost

if [ $? -eq 0 ]; then
  echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
  echo -e "${YELLOW}💡 The web config has been automatically updated.${NC}"
  echo ""
  echo -e "${GREEN}🔧 Next steps:${NC}"
  echo "1. Start/restart your web app: cd ../web && npm run dev"
  echo "2. Your contracts are ready to use!"
  echo ""
  echo -e "${GREEN}🧪 Testing:${NC}"
  echo "• npx hardhat test test/fullFlow.test.ts --network localhost"
  echo "• npx hardhat test test/lotteryIntegrationFlow.test.ts --network localhost"
else
  echo -e "${RED}❌ Deployment failed!${NC}"
  exit 1
fi
