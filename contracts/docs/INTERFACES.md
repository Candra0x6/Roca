# Arisan+ Smart Contract Interfaces

This document provides detailed specifications for the Arisan+ platform's smart contract interfaces.

## Overview

The Arisan+ platform consists of four main interface contracts that define the core functionality:

- **IPool**: Core savings pool management
- **ILottery**: Bonus lottery and prize distribution system  
- **IBadge**: NFT achievement and reputation system
- **IYieldManager**: Yield generation and DeFi integration

## Interface Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     IPool       │    │   ILottery      │    │    IBadge       │
│                 │    │                 │    │                 │
│ • Pool Lifecycle│    │ • Weekly Draws  │    │ • Achievement   │
│ • Member Mgmt   │    │ • Prize Dist.   │    │   NFTs          │
│ • Fund Control  │    │ • Randomness    │    │ • Reputation    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │    IYieldManager        │
                    │                         │
                    │ • Strategy Management   │
                    │ • DeFi Integration      │
                    │ • Yield Distribution    │
                    └─────────────────────────┘
```

## Interface Specifications

### IPool.sol

**Purpose**: Manages the core savings pool functionality including member management, lifecycle control, and fund distribution.

#### Key Features:
- **Pool Lifecycle**: Open → Locked → Active → Completed
- **Member Management**: Join, leave, and track member contributions
- **Yield Integration**: Automatic yield generation through YieldManager
- **Security**: Emergency withdrawal and access control

#### Core Structs:
```solidity
struct PoolInfo {
    address creator;           // Pool creator address
    string name;              // Human-readable pool name
    uint256 contributionAmount; // Required contribution per member
    uint256 maxMembers;       // Maximum allowed members
    uint256 duration;         // Pool duration in seconds
    PoolStatus status;        // Current pool status
    uint256 createdAt;        // Creation timestamp
    uint256 lockedAt;         // Lock timestamp
    uint256 totalFunds;       // Total pool funds
    uint256 currentMembers;   // Current member count
    address yieldManager;     // Yield manager address
}

struct PoolMember {
    address memberAddress;    // Member address
    uint256 contribution;     // Member contribution
    uint256 joinedAt;        // Join timestamp
    bool hasWithdrawn;       // Withdrawal status
    uint256 yieldEarned;     // Total yield earned
}
```

#### Critical Functions:
- `joinPool()`: Payable function for joining pools
- `lockPool()`: Transitions pool to yield-generating state
- `completePool()`: Finalizes pool and enables withdrawals
- `withdrawShare()`: Distributes principal + yield to members

### ILottery.sol

**Purpose**: Manages weekly bonus drawings and prize distribution for pool members.

#### Key Features:
- **Weekly Draws**: Automated lottery system
- **Weighted Selection**: Based on contribution and tenure
- **Prize Distribution**: 10% of weekly yield as bonus
- **History Tracking**: Complete lottery audit trail

#### Core Structs:
```solidity
struct LotteryDraw {
    uint256 drawId;           // Unique draw identifier
    uint256 poolId;           // Associated pool
    address winner;           // Winner address
    uint256 prizeAmount;      // Prize amount
    uint256 drawTime;         // Draw timestamp
    uint256 totalParticipants; // Participant count
    bytes32 randomSeed;       // Random seed used
    bool isPaidOut;           // Payout status
}

struct LotteryConfig {
    uint256 drawInterval;     // Time between draws
    uint256 prizePercentage;  // Prize percentage (basis points)
    uint256 minPoolSize;      // Minimum pool size
    uint256 maxPrizeAmount;   // Maximum prize cap
    bool isActive;            // System active status
}
```

#### Critical Functions:
- `requestDraw(poolId)`: Initiates lottery draw
- `selectWinner(drawId)`: Pseudo-random winner selection
- `distributePrize(drawId)`: Prize payout to winner
- `addParticipants()`: Registers eligible pool members

### IBadge.sol

**Purpose**: ERC-721 NFT system for user achievements and reputation building.

#### Key Features:
- **Achievement Types**: 8 different badge categories
- **Rarity System**: Common to Legendary classifications
- **Reputation Scoring**: Weighted reputation calculation
- **Batch Operations**: Efficient multi-badge minting

#### Core Structs:
```solidity
struct BadgeInfo {
    uint256 tokenId;          // Unique token ID
    BadgeType badgeType;      // Badge category
    BadgeRarity rarity;       // Rarity level
    address recipient;        // Badge owner
    uint256 earnedAt;         // Earned timestamp
    uint256 poolId;           // Associated pool
    string title;             // Badge title
    string description;       // Badge description
    string imageURI;          // Image metadata
    uint256 value;            // Associated value
    bytes32 achievementHash;  // Verification hash
}

struct UserBadgeStats {
    uint256 totalBadges;      // Total badge count
    uint256 commonCount;      // Common badges
    uint256 uncommonCount;    // Uncommon badges
    uint256 rareCount;        // Rare badges
    uint256 epicCount;        // Epic badges
    uint256 legendaryCount;   // Legendary badges
    uint256 reputationScore;  // Calculated reputation
}
```

#### Badge Types:
1. **PoolCreator**: For creating successful pools
2. **EarlyJoiner**: For early pool participation
3. **LotteryWinner**: For winning lottery draws
4. **PoolCompleter**: For completing pool cycles
5. **HighYielder**: For significant yield generation
6. **Veteran**: For long-term platform participation
7. **SocialInfluencer**: For user referrals
8. **TrustBuilder**: For creating reliable pools

#### Critical Functions:
- `mintBadge()`: Creates achievement NFTs
- `batchMintBadges()`: Efficient batch minting
- `calculateReputationScore()`: Reputation calculation
- `getReputationLeaderboard()`: Platform rankings

### IYieldManager.sol

**Purpose**: Manages yield generation strategies and DeFi protocol integration.

#### Key Features:
- **Strategy Management**: Multiple yield generation options
- **DeFi Integration**: Lido, Aave, Compound support
- **Performance Tracking**: APY monitoring and optimization
- **Risk Management**: Emergency withdrawal capabilities

#### Core Structs:
```solidity
struct StrategyInfo {
    YieldStrategy strategyType;  // Strategy identifier
    string name;                 // Strategy name
    string description;          // Strategy details
    uint256 expectedAPY;         // Expected APY (basis points)
    uint256 minDeposit;         // Minimum deposit
    uint256 maxDeposit;         // Maximum deposit
    uint256 lockPeriod;         // Lock duration
    bool isActive;              // Active status
    address strategyAddress;    // Implementation address
    uint256 totalDeposited;     // Total deposited
    uint256 totalYieldGenerated; // Total yield generated
}

struct PoolInvestment {
    uint256 poolId;             // Pool identifier
    address poolAddress;        // Pool contract
    uint256 principalAmount;    // Original investment
    uint256 currentValue;       // Current total value
    uint256 yieldGenerated;     // Yield generated
    YieldStrategy strategy;     // Strategy used
    uint256 depositedAt;        // Deposit timestamp
    uint256 lastYieldUpdate;    // Last update time
    bool isActive;              // Investment status
}
```

#### Yield Strategies:
1. **MockYield**: Dummy 5% APY for MVP testing
2. **LidoStaking**: Ethereum 2.0 staking via Lido
3. **AaveDeposit**: DeFi lending via Aave protocol
4. **CompoundDeposit**: DeFi lending via Compound
5. **CurveDeposit**: Stablecoin yield via Curve Finance
6. **Custom**: Extensible custom strategy support

#### Critical Functions:
- `deposit(poolId, strategy)`: Invest pool funds
- `withdraw(poolId)`: Retrieve principal + yield
- `updateYield(poolId)`: Sync yield calculations
- `getBestStrategy(amount)`: Optimal strategy recommendation

## Integration Patterns

### Pool → YieldManager Flow
```solidity
// When pool locks
IYieldManager(yieldManager).deposit{value: totalFunds}(poolId, strategy);

// During pool lifecycle
IYieldManager(yieldManager).updateYield(poolId);

// When pool completes
(principal, yield) = IYieldManager(yieldManager).withdraw(poolId);
```

### Pool → Lottery Integration
```solidity
// When pool locks
ILottery(lotteryManager).addParticipants(poolId, members, weights);

// Weekly draws
ILottery(lotteryManager).requestDraw(poolId);
ILottery(lotteryManager).selectWinner(drawId);
```

### Achievement → Badge Integration
```solidity
// On pool creation
IBadge(badgeContract).mintBadge(creator, BadgeType.PoolCreator, poolId, 0, "");

// On lottery win
IBadge(badgeContract).mintBadge(winner, BadgeType.LotteryWinner, poolId, prizeAmount, "");
```

## Security Considerations

### Access Control
- **Role-based permissions** using OpenZeppelin AccessControl
- **Emergency functions** for admin intervention
- **Multi-signature requirements** for critical operations

### Economic Security
- **Slippage protection** for DeFi interactions
- **Maximum limits** on pool sizes and investments
- **Rate limiting** on sensitive functions

### Technical Security
- **Reentrancy guards** on all external calls
- **Custom errors** for gas efficiency
- **Comprehensive events** for audit trails
- **Input validation** on all parameters

## Gas Optimization

### Efficient Data Structures
- **Packed structs** to minimize storage slots
- **Mapping optimization** for member lookups
- **Batch operations** for multiple actions

### Function Optimization
- **View functions** for read-only operations
- **Calldata parameters** for array inputs
- **Memory usage** optimization in computations

## Testing Strategy

### Interface Validation
- **Compilation testing** ensures interfaces are syntactically correct
- **Function signature verification** confirms all required functions exist
- **Event definition validation** ensures proper event structures
- **Enum value testing** verifies enumeration correctness

### Integration Testing
- **Cross-interface compatibility** testing
- **Event parameter alignment** validation
- **Gas efficiency verification** for all operations

## Deployment Considerations

### Contract Dependencies
```
1. Deploy YieldManager (independent)
2. Deploy Badge contract (independent) 
3. Deploy Lottery contract (independent)
4. Deploy PoolFactory (depends on all above)
5. Configure cross-contract permissions
```

### Configuration Parameters
- **Yield strategies** and their configurations
- **Lottery parameters** (draw intervals, prize percentages)
- **Badge templates** and rarity configurations
- **Access control roles** and permissions

## Future Extensibility

### V2 Enhancements
- **Chainlink VRF** integration for true randomness
- **Cross-chain** pool support via bridges
- **Advanced DeFi** strategies (leveraged yield farming)
- **DAO governance** for parameter updates

### Interface Evolution
- **Backward compatibility** maintained through versioning
- **Upgrade patterns** using proxy contracts where needed
- **Extension interfaces** for additional functionality

## Documentation Standards

All interfaces follow comprehensive NatSpec documentation:
- **Contract-level** documentation with purpose and overview
- **Function-level** documentation with parameters and behavior
- **Event documentation** with parameter descriptions
- **Security considerations** for each function
- **Gas optimization** notes where relevant

This interface specification serves as the foundation for implementing the complete Arisan+ decentralized savings platform.
