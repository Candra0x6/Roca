# Arisan+ Smart Contracts

This directory contains the smart contracts for the Arisan+ decentralized social saving platform.

## Project Structure

```
contracts/
├── contracts/          # Solidity smart contracts
│   └── Lock.sol        # Time-locked contract (example)
├── test/              # TypeScript test files
│   └── Lock.ts        # Comprehensive test suite
├── ignition/          # Hardhat Ignition deployment modules
│   └── modules/
│       └── Lock.ts    # Deployment configuration
├── typechain-types/   # Generated TypeScript types
├── hardhat.config.ts  # Hardhat configuration
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── .env.example       # Environment variables template
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Compile Contracts**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Configuration

### Solidity Version
- **Version**: 0.8.30
- **Optimizer**: Enabled (200 runs)
- **viaIR**: Enabled for better optimization

### Networks Configured
- **Hardhat**: Local development network
- **Localhost**: Local node (hardhat node)
- **Sepolia**: Ethereum testnet
- **Mainnet**: Ethereum mainnet

### Features Enabled
- TypeChain type generation
- Gas reporting
- Test coverage
- Contract verification on Etherscan
- Solidity coverage reporting

## Available Scripts

```bash
# Build contracts and generate types
npm run build

# Run test suite
npm test

# Run tests with gas reporting
npm run test:gas

# Run tests with coverage report
npm run test:coverage

# Start local Hardhat node
npm run node

# Deploy to localhost
npm run deploy:localhost

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run deploy:mainnet

# Verify contract on Etherscan (after deployment)
npm run verify:sepolia
npm run verify:mainnet

# Clean artifacts and cache
npm run clean

# Generate TypeChain types
npm run typechain
```

## Contract Architecture

### Lock.sol (Example Contract)
A time-locked contract demonstrating:
- **Security Patterns**: Checks-effects-interactions, custom errors
- **Gas Optimization**: Efficient storage, optimized functions
- **Documentation**: Full NatSpec comments
- **Testing**: Comprehensive test coverage (15 test cases)

#### Key Features:
- Time-locked fund withdrawal
- Owner-only access control
- Custom error messages for better UX
- Event emission for transparency
- View functions for frontend integration

## Testing

The test suite includes:
- ✅ Deployment validation
- ✅ Access control testing
- ✅ Time-lock functionality
- ✅ Error handling with custom errors
- ✅ Event emission verification
- ✅ Gas optimization validation
- ✅ Edge case coverage

**Coverage**: 100% statement, branch, and function coverage

## Gas Optimization

Current gas usage:
- **Deployment**: ~235k gas (0.8% of block limit)
- **Withdrawal**: ~33k gas
- **View functions**: <5k gas each

## Security Features

- **Custom Errors**: Gas-efficient error handling
- **Access Control**: Owner-only functions
- **Reentrancy Protection**: Safe external calls
- **Input Validation**: Comprehensive parameter checking
- **Time Validation**: Secure timestamp handling

## Development Workflow

1. **Write Contract**: Add Solidity files to `contracts/`
2. **Add Tests**: Create corresponding test files in `test/`
3. **Compile**: Run `npm run build`
4. **Test**: Run `npm test`
5. **Deploy**: Use ignition modules for deployment
6. **Verify**: Verify contracts on Etherscan

## Environment Variables

Required for testnet/mainnet deployment:

```bash
# Private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Features
REPORT_GAS=true
```

## Next Steps

This setup is ready for implementing the Arisan+ protocol contracts:
- PoolFactory.sol
- Pool.sol
- YieldManager.sol
- LotteryManager.sol
- RewardNFT.sol

## Support

For issues or questions:
1. Check the [Hardhat documentation](https://hardhat.org/docs)
2. Review the test files for usage examples
3. Ensure all environment variables are correctly set
