# ZetaChain Athens 3 Testnet Deployment Guide

This guide covers deploying the Roca project contracts to ZetaChain Athens 3 testnet.

## Prerequisites

1. **Funded Wallet**: Get aZETA from the faucet
   - Visit: https://labs.zetachain.com/get-zeta
   - Connect your wallet and request testnet tokens

2. **Environment Setup**: Create/update your `.env` file in the `contracts` directory:
   ```env
   PRIVATE_KEY=your_private_key_here
   ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
   ZETACHAIN_API_KEY=dummy-api-key
   ZETACHAIN_EXPLORER_API_URL=https://athens3.zetascan.io/api
   ZETACHAIN_EXPLORER_URL=https://athens3.zetascan.io
   ```

## Network Configuration

The ZetaChain Athens 3 testnet configuration has been added to:

### Hardhat Config (`hardhat.config.ts`)
```typescript
zetachain: {
  url: process.env.ZETACHAIN_RPC_URL || "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  chainId: 7001, // ZetaChain Athens 3 testnet chain ID
  gas: 2100000,
  gasPrice: 8000000000,
}
```

### Frontend Config (`web/src/wagmi.ts`)
```typescript
export const zetaChainAthens3 = {
  id: 7001,
  name: 'ZetaChain Athens 3',
  nativeCurrency: { name: 'Zeta', symbol: 'aZETA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://athens3.zetascan.io' },
  },
} as const;
```

## Deployment Process

### Option 1: Using the Shell Script (Linux/Mac/WSL)
```bash
# Navigate to contracts directory
cd contracts

# Make script executable
chmod +x scripts/deploy-zetachain.sh

# Run deployment
./scripts/deploy-zetachain.sh
```

### Option 2: Using Hardhat Directly
```bash
# Navigate to contracts directory
cd contracts

# Compile contracts
npx hardhat compile

# Deploy to ZetaChain Athens 3
npx hardhat run scripts/deploy-zetachain.ts --network zetachain
```

## Deployment Script Features

The deployment script (`deploy-zetachain.ts`) will:

1. **Deploy YieldManager**: Real yield manager (not mock) for testnet
2. **Deploy Badge**: NFT contract serving as both Badge and RewardNFT
3. **Deploy LotteryManager**: Lottery system integration
4. **Deploy PoolFactory**: Main factory contract for pool creation
5. **Configure Integrations**: 
   - Set PoolFactory in YieldManager
   - Set YieldManager in PoolFactory
   - Grant POOL_CREATOR role to PoolFactory in LotteryManager
6. **Update Frontend Config**: Automatically update contract addresses
7. **Save Deployment Record**: Store deployment details for reference

## Expected Output

Upon successful deployment, you'll see:
```
🌟 ZetaChain Athens 3 Testnet Deployment Complete!
──────────────────────────────────────────────────
Network: ZetaChain Athens 3 Testnet (Chain ID: 7001)
YieldManager: 0x...
Badge/RewardNFT: 0x...
LotteryManager: 0x...
PoolFactory: 0x...
Deployer: 0x...
```

## Post-Deployment Steps

### 1. Fund YieldManager
Send some aZETA to the YieldManager for yield generation:
```bash
# The deployment script will show the YieldManager address
# Send aZETA to this address using MetaMask or another wallet
```

### 2. Verify Contracts
Use the provided verification commands:
```bash
npx hardhat verify <YieldManager_Address> --network zetachain
npx hardhat verify <Badge_Address> --network zetachain
npx hardhat verify <LotteryManager_Address> <Badge_Address> <Deployer_Address> --network zetachain
npx hardhat verify <PoolFactory_Address> <Deployer_Address> <Badge_Address> <LotteryManager_Address> --network zetachain
```

### 3. Test Frontend Integration
The contracts addresses will be automatically updated in `web/src/contracts/config.ts`. Test the frontend with:
```bash
cd ../web
npm run dev
```

## Troubleshooting

### Common Issues

1. **Insufficient Funds**
   - Get more aZETA from: https://labs.zetachain.com/get-zeta
   - Ensure your wallet has enough aZETA for deployment and gas fees

2. **Network Connection Issues**
   - Verify `ZETACHAIN_RPC_URL` in your `.env` file
   - Try alternative RPC endpoints if needed

3. **Gas Issues**
   - ZetaChain may require higher gas limits
   - The deployment script uses conservative gas settings

4. **Contract Verification**
   - Use ZetaScan explorer: https://athens3.zetascan.io
   - Manual verification may be needed if automatic verification fails

## Useful Links

- **ZetaScan Explorer**: https://athens3.zetascan.io
- **ZetaChain Faucet**: https://labs.zetachain.com/get-zeta
- **ZetaChain Documentation**: https://docs.zetachain.com
- **ZetaChain Discord**: https://discord.gg/zetachain

## Network Details

- **Chain ID**: 7001
- **Network Name**: ZetaChain Athens 3
- **Currency**: aZETA
- **RPC URL**: https://zetachain-athens-evm.blockpi.network/v1/rpc/public
- **Explorer**: https://athens3.zetascan.io

## Notes

- This is a testnet deployment - do not use real funds
- The Badge contract serves as both Badge and RewardNFT to optimize deployment
- All integrations are automatically configured during deployment
- Frontend configuration is automatically updated with new contract addresses