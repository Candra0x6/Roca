# Somnia Testnet Deployment

This script deploys the core contracts (YieldManager and PoolFactory) to the Somnia testnet.

## Prerequisites

1. **Environment Setup**: Make sure you have the following in your `.env` file:
   ```
   PRIVATE_KEY=your_private_key_here
   SOMNIA_RPC_URL=https://testnet.somnia.network
   ```

2. **Testnet Funds**: Ensure your deployer account has sufficient testnet ETH for deployment.

## Deployment

To deploy to Somnia testnet:

```bash
npx hardhat run scripts/deploy-somnia.ts --network somnia
```

## What Gets Deployed

1. **YieldManager**: Real yield manager contract (not Mock)
2. **PoolFactory**: Factory contract for creating pools

Note: This is a minimal deployment. Badge/RewardNFT and LotteryManager contracts can be deployed separately if needed.

## After Deployment

1. The script automatically updates the web configuration file (`web/src/contracts/config.ts`)
2. Deployment details are saved to a timestamped JSON file
3. Contract verification commands are provided in the output

## Network Configuration

- **Chain ID**: 50311
- **Network Name**: Somnia Testnet
- **RPC URL**: https://testnet.somnia.network

## Verification

After deployment, you can verify the contracts on Shannon explorer:

```bash
# Verify YieldManager
npx hardhat verify <YIELD_MANAGER_ADDRESS> --network somnia

# Verify PoolFactory (with constructor arguments)
npx hardhat verify <POOL_FACTORY_ADDRESS> <DEPLOYER_ADDRESS> 0x0000000000000000000000000000000000000000 0x0000000000000000000000000000000000000000 --network somnia
```

**Note**: Sourcify verification is disabled for Somnia testnet as it doesn't support chain ID 50312 yet.

## Troubleshooting

### Insufficient Funds
- Get testnet ETH from Somnia faucet
- Check your deployer address in the deployment output

### Network Issues
- Verify your `SOMNIA_RPC_URL` in `.env`
- Check if the Somnia testnet is accessible

### Transaction Failures
- Check gas limits and network congestion
- Ensure contract compilation is successful before deployment
