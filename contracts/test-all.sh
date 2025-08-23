#!/bin/bash

echo "🧪 Starting Arisan+ Smart Contract Test Suite"
echo "=============================================="

# Phase 1: Foundation & Interfaces
echo "📋 Phase 1: Foundation & Interfaces"
echo "npx hardhat test test/Interfaces.ts"
npx hardhat test test/Interfaces.ts
if [ $? -ne 0 ]; then echo "❌ Interfaces test failed"; exit 1; fi

echo "npx hardhat test test/YieldManagerBasic.ts"
npx hardhat test test/YieldManagerBasic.ts
if [ $? -ne 0 ]; then echo "❌ YieldManagerBasic test failed"; exit 1; fi

echo "npx hardhat test test/YieldManager.ts"
npx hardhat test test/YieldManager.ts
if [ $? -ne 0 ]; then echo "❌ YieldManager test failed"; exit 1; fi

# Phase 2: Core Pool Infrastructure
echo "🏗️  Phase 2: Core Pool Infrastructure"
echo "npx hardhat test test/PoolDataStructures.ts"
npx hardhat test test/PoolDataStructures.ts
if [ $? -ne 0 ]; then echo "❌ PoolDataStructures test failed"; exit 1; fi

echo "npx hardhat test test/PoolFactory.ts"
npx hardhat test test/PoolFactory.ts
if [ $? -ne 0 ]; then echo "❌ PoolFactory test failed"; exit 1; fi

echo "npx hardhat test test/PoolFactoryRegistry.ts"
npx hardhat test test/PoolFactoryRegistry.ts
if [ $? -ne 0 ]; then echo "❌ PoolFactoryRegistry test failed"; exit 1; fi

echo "npx hardhat test test/PoolJoining.ts"
npx hardhat test test/PoolJoining.ts
if [ $? -ne 0 ]; then echo "❌ PoolJoining test failed"; exit 1; fi

echo "npx hardhat test test/PoolLifecycle.ts"
npx hardhat test test/PoolLifecycle.ts
if [ $? -ne 0 ]; then echo "❌ PoolLifecycle test failed"; exit 1; fi

# Phase 3: Advanced Systems
echo "⚡ Phase 3: Advanced Systems"
echo "npx hardhat test test/PoolYieldManagerIntegration.ts"
npx hardhat test test/PoolYieldManagerIntegration.ts
if [ $? -ne 0 ]; then echo "❌ PoolYieldManagerIntegration test failed"; exit 1; fi

echo "npx hardhat test test/SC007Integration.ts"
npx hardhat test test/SC007Integration.ts
if [ $? -ne 0 ]; then echo "❌ SC007Integration test failed"; exit 1; fi

echo "npx hardhat test test/RewardNFT.ts"
npx hardhat test test/RewardNFT.ts
if [ $? -ne 0 ]; then echo "❌ RewardNFT test failed"; exit 1; fi

echo "npx hardhat test test/LotteryManager.ts"
npx hardhat test test/LotteryManager.ts
if [ $? -ne 0 ]; then echo "❌ LotteryManager test failed"; exit 1; fi

echo "npx hardhat test test/LotteryManagerEnhanced.ts"
npx hardhat test test/LotteryManagerEnhanced.ts
if [ $? -ne 0 ]; then echo "❌ LotteryManagerEnhanced test failed"; exit 1; fi

echo "npx hardhat test test/LotteryManagerSC009.ts"
npx hardhat test test/LotteryManagerSC009.ts
if [ $? -ne 0 ]; then echo "❌ LotteryManagerSC009 test failed"; exit 1; fi

# Phase 4: Integration Testing
echo "🔗 Phase 4: Integration Testing"
echo "npx hardhat test test/BadgeIntegrationBasic.ts"
npx hardhat test test/BadgeIntegrationBasic.ts
if [ $? -ne 0 ]; then echo "❌ BadgeIntegrationBasic test failed"; exit 1; fi

echo "npx hardhat test test/BadgeIntegration.ts"
npx hardhat test test/BadgeIntegration.ts
if [ $? -ne 0 ]; then echo "❌ BadgeIntegration test failed"; exit 1; fi

echo "npx hardhat test test/BadgePoolIntegration.ts"
npx hardhat test test/BadgePoolIntegration.ts
if [ $? -ne 0 ]; then echo "❌ BadgePoolIntegration test failed"; exit 1; fi

# Phase 5: Complete System Test
echo "🎯 Phase 5: Complete System Test"
echo "npx hardhat test --verbose"
npx hardhat test --verbose
if [ $? -ne 0 ]; then echo "❌ Complete system test failed"; exit 1; fi

echo "✅ All tests passed! Arisan+ smart contracts are ready! 🎉"
