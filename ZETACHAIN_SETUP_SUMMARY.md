# ZetaChain Testnet Deployment Summary

## 🎯 Overview
Complete deployment and configuration setup for ZetaChain Athens 3 testnet has been created for the Roca project.

## 📁 Files Created/Updated

### 1. Hardhat Configuration
- **File**: `contracts/hardhat.config.ts`
- **Changes**: Added ZetaChain network configuration
- **Network**: Chain ID 7001, Athens 3 testnet

### 2. Deployment Scripts
- **TypeScript**: `contracts/scripts/deploy-zetachain.ts`
- **Shell Script**: `contracts/scripts/deploy-zetachain.sh` (Linux/Mac/WSL)
- **PowerShell**: `contracts/scripts/deploy-zetachain.ps1` (Windows)

### 3. Frontend Configuration  
- **File**: `web/src/wagmi.ts` (already configured)
- **File**: `web/src/contracts/config.ts` (placeholder addresses added)

### 4. Documentation
- **File**: `contracts/scripts/ZETACHAIN_DEPLOYMENT.md`
- **Content**: Comprehensive deployment guide

## 🔧 Configuration Details

### Network Configuration
```typescript
zetachain: {
  url: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
  accounts: [process.env.PRIVATE_KEY],
  chainId: 7001,
  gas: 2100000,
  gasPrice: 8000000000,
}
```

### Required Environment Variables
```env
PRIVATE_KEY=your_private_key_here
ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
ZETACHAIN_API_KEY=dummy-api-key
ZETACHAIN_EXPLORER_API_URL=https://athens3.zetascan.io/api
ZETACHAIN_EXPLORER_URL=https://athens3.zetascan.io
```

## 🚀 Deployment Process

### Contracts to Deploy (in order):
1. **YieldManager** - Real yield manager for testnet
2. **Badge** - NFT contract serving as both Badge and RewardNFT  
3. **LotteryManager** - Lottery system integration
4. **PoolFactory** - Main factory contract

### Automatic Configuration:
- Set PoolFactory in YieldManager
- Set YieldManager in PoolFactory  
- Grant POOL_CREATOR role to PoolFactory in LotteryManager
- Update frontend contract addresses

## 📋 How to Deploy

### Option 1: PowerShell (Windows)
```powershell
cd contracts
.\scripts\deploy-zetachain.ps1
```

### Option 2: Shell Script (Linux/Mac/WSL)
```bash
cd contracts
chmod +x scripts/deploy-zetachain.sh
./scripts/deploy-zetachain.sh
```

### Option 3: Direct Hardhat
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy-zetachain.ts --network zetachain
```

## 🔍 Verification

After deployment, verify contracts using:
```bash
npx hardhat verify <contract_address> [constructor_args] --network zetachain
```

## 🌐 Network Information

- **Name**: ZetaChain Athens 3
- **Chain ID**: 7001
- **Currency**: aZETA
- **RPC**: https://zetachain-athens-evm.blockpi.network/v1/rpc/public
- **Explorer**: https://athens3.zetascan.io
- **Faucet**: https://labs.zetachain.com/get-zeta

## ✅ Next Steps

1. **Fund Wallet**: Get aZETA from the faucet
2. **Set Environment**: Create/update `.env` file
3. **Deploy Contracts**: Run deployment script
4. **Fund YieldManager**: Send aZETA for yield generation
5. **Test Frontend**: Verify integration works
6. **Verify Contracts**: Submit to ZetaScan explorer

## 🛠️ Troubleshooting

Common issues and solutions are documented in `ZETACHAIN_DEPLOYMENT.md`.

---

The ZetaChain testnet is now fully configured and ready for deployment! 🎉