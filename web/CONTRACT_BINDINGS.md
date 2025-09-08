# Contract TypeScript Bindings Implementation

## Overview

This implementation provides comprehensive TypeScript bindings for all smart contracts in the Roca platform, enabling type-safe interactions with wagmi v2 and viem v2.

## Features Implemented

### ✅ Core Contract Bindings
- **PoolFactory** - Create and manage pool creation
- **Pool** - Join, leave, and interact with individual pools
- **Badge** - Manage NFT badges for achievements
- **LotteryManager** - Handle lottery draws and prize distribution
- **YieldManager** - Manage yield generation and staking
- **RewardNFT** - Additional NFT reward management

### ✅ Type-Safe Contract Interactions
- Full TypeScript interfaces for all contract data structures
- Strongly typed function parameters and return values
- Automatic type inference for contract calls
- Error handling with meaningful error messages

### ✅ React Hooks
- **usePoolFactory** - Pool creation and discovery
- **usePool** - Individual pool management
- **useBadge** - Badge collection and metadata
- **useLottery** - Lottery participation and history
- **useYieldManager** - Yield tracking and management
- **useWalletConnection** - Wallet state management

### ✅ Utility Functions
- Pool state formatting and validation
- Amount formatting and parsing
- Time calculations and display
- Address shortening and validation
- Error message parsing

## File Structure

```
src/
├── contracts/
│   ├── config.ts          # Contract addresses and ABIs
│   ├── types.ts           # TypeScript interfaces
│   ├── utils.ts           # Utility functions
│   ├── index.ts           # Barrel exports
│   └── *.json             # Contract artifacts
├── hooks/
│   ├── usePoolFactory.ts  # Pool factory interactions
│   ├── usePool.ts         # Pool management
│   ├── useBadge.ts        # Badge collection
│   ├── useLottery.ts      # Lottery management
│   ├── useYieldManager.ts # Yield tracking
│   └── index.ts           # Barrel exports
└── components/
    └── ContractTestComponent.tsx # Test component
```

## Usage Examples

### Creating a Pool
```typescript
import { usePoolFactory } from '@/hooks'
import { parseEther } from 'viem'

function CreatePoolComponent() {
  const { createPool, isLoading } = usePoolFactory()

  const handleCreate = async () => {
    const params = {
      name: "My Savings Pool",
      contributionAmount: parseEther("0.1"),
      maxMembers: 10n,
      duration: 30n * 24n * 60n * 60n, // 30 days
    }
    
    const poolAddress = await createPool(params)
    console.log('Pool created:', poolAddress)
  }

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Creating...' : 'Create Pool'}
    </button>
  )
}
```

### Joining a Pool
```typescript
import { usePool } from '@/hooks'

function PoolComponent({ poolAddress }: { poolAddress: Address }) {
  const { poolInfo, joinPool, canJoin, isLoading } = usePool(poolAddress)

  return (
    <div>
      <h3>{poolInfo?.name}</h3>
      <p>Members: {poolInfo?.currentMembers?.toString()}/{poolInfo?.maxMembers?.toString()}</p>
      <button 
        onClick={joinPool} 
        disabled={!canJoin || isLoading}
      >
        {isLoading ? 'Joining...' : 'Join Pool'}
      </button>
    </div>
  )
}
```

### Checking Badges
```typescript
import { useBadge } from '@/hooks'
import { formatBadgeType, getBadgeIcon } from '@/contracts'

function BadgeCollection() {
  const { badges, isLoading } = useBadge()

  if (isLoading) return <div>Loading badges...</div>

  return (
    <div>
      <h3>My Badges</h3>
      {badges.map((badge, index) => (
        <div key={index}>
          <span>{getBadgeIcon(badge.badgeType)}</span>
          <span>{formatBadgeType(badge.badgeType)}</span>
        </div>
      ))}
    </div>
  )
}
```

## Type Safety Features

### Pool State Management
```typescript
// Strongly typed pool states
enum PoolState {
  Open = 0,
  Locked = 1,
  Active = 2,
  Completed = 3
}

// Type-safe state checks
const canJoin = poolInfo.state === PoolState.Open && !poolInfo.isUserMember
```

### Error Handling
```typescript
// Typed error responses
interface UsePoolReturn {
  poolInfo: PoolDetails | null
  joinPool: () => Promise<void>
  error: Error | null
  // ... other properties
}

// Meaningful error messages
const error = parseContractError(err) // "Pool is already full"
```

### Contract Configuration
```typescript
// Type-safe contract addresses
const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')

// Strongly typed ABIs
const { data } = useReadContract({
  address: poolFactoryAddress,
  abi: POOL_FACTORY_ABI,
  functionName: 'getAllPools',
})
```

## Testing

The implementation includes a comprehensive test component (`ContractTestComponent.tsx`) that demonstrates:
- Wallet connection flow
- Pool creation and management
- Badge collection display
- Lottery participation
- Yield tracking
- Error handling and loading states

## Network Support

Configured for:
- **Hardhat localhost** (chainId: 31337)
- **Sepolia testnet** (chainId: 11155111)
- **Ethereum mainnet** (chainId: 1)

Contract addresses are automatically resolved based on the connected network.

## Integration with wagmi v2

- Uses latest wagmi hooks (`useReadContract`, `useWriteContract`, etc.)
- Implements proper loading and error states
- Supports real-time contract data updates
- Compatible with wagmi's caching and refetching mechanisms

## Next Steps

1. Deploy contracts to testnet and update addresses
2. Add comprehensive unit tests
3. Implement event listening for real-time updates
4. Add more sophisticated error handling
5. Create documentation for UI components

## Dependencies

- `wagmi` v2 - React hooks for Ethereum
- `viem` v2 - TypeScript interface for Ethereum
- `@tanstack/react-query` - Data fetching and caching
- Next.js 14 - React framework
- TypeScript - Type safety
