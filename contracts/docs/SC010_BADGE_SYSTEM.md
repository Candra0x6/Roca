# SC-010: ERC-721 Badge System Implementation

## Overview

SC-010 implements a comprehensive achievement badge system for the Roca platform using ERC-721 non-fungible tokens (NFTs). The system gamifies user participation by awarding digital badges for various milestones and achievements.

## Architecture

### Core Contract: RewardNFT

The `RewardNFT` contract implements the `IBadge` interface and extends multiple OpenZeppelin contracts:

- **ERC721**: Base NFT functionality
- **ERC721URIStorage**: Metadata management
- **ERC721Enumerable**: Token enumeration capabilities
- **AccessControl**: Role-based permissions
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality

### Badge Types

The system supports 8 different badge types:

1. **PoolCreator** (Uncommon) - Created first savings pool
2. **EarlyJoiner** (Common) - Joined a pool among first 3 members
3. **LotteryWinner** (Rare) - Won a weekly lottery draw
4. **PoolCompleter** (Common) - Successfully completed a savings pool
5. **HighYielder** (Epic) - Earned significant yield from DeFi strategies
6. **Veteran** (Epic) - Participated in 10+ pools
7. **SocialInfluencer** (Rare) - Referred 5+ users to the platform
8. **TrustBuilder** (Legendary) - Created 5+ successful pools with 100% completion rate

### Rarity System

Badges are classified into 5 rarity levels with different reputation multipliers:

- **Common** (1x multiplier) - Basic achievements
- **Uncommon** (3x multiplier) - Notable milestones
- **Rare** (10x multiplier) - Significant accomplishments
- **Epic** (30x multiplier) - Exceptional achievements
- **Legendary** (100x multiplier) - Elite accomplishments

## Key Features

### 1. Badge Minting

```solidity
function mintBadge(
    address recipient,
    BadgeType badgeType,
    uint256 poolId,
    uint256 value,
    bytes calldata achievementData
) external returns (uint256 tokenId)
```

- Only authorized contracts (Pool, Lottery) can mint badges
- Validates minimum value requirements
- Enforces supply limits
- Prevents duplicate unique badges
- Emits `BadgeMinted` event

### 2. Batch Operations

```solidity
function batchMintBadges(
    address recipient,
    BadgeType[] calldata badgeTypes,
    uint256[] calldata poolIds,
    uint256[] calldata values
) external returns (uint256[] memory tokenIds)
```

Efficient batch minting for users achieving multiple milestones simultaneously.

### 3. Reputation System

```solidity
function calculateReputationScore(address user) external view returns (uint256)
```

Calculates user reputation based on badges owned, weighted by rarity multipliers.

### 4. Badge Queries

- **User Badges**: `getUserBadges(address user)`
- **Type Filter**: `getBadgesByType(BadgeType badgeType)`
- **Rarity Filter**: `getBadgesByRarity(BadgeRarity rarity)`
- **Pool Badges**: `getPoolBadges(uint256 poolId)`
- **Ownership**: `ownsBadgeType(address user, BadgeType badgeType)`

### 5. Template Management

Admins can update badge templates including:
- Title and description
- Image URI
- Minimum value requirements
- Supply limits
- Active status

### 6. Metadata Management

Both admins and token owners can update badge metadata (image URIs).

### 7. Emergency Controls

- **Pause**: Stop all minting operations
- **Unpause**: Resume normal operations
- **Role Management**: Grant/revoke minter permissions

## Integration Points

### Pool Contract Integration

```solidity
// Example: Mint badge when user creates pool
rewardNFT.mintBadge(
    creator,
    BadgeType.PoolCreator,
    poolId,
    1,
    abi.encode("first_pool")
);
```

### Lottery Contract Integration

```solidity
// Example: Mint badge for lottery winner
rewardNFT.mintBadge(
    winner,
    BadgeType.LotteryWinner,
    poolId,
    prizeAmount,
    abi.encode("weekly_draw")
);
```

## Security Features

### Access Control

- **BADGE_MINTER_ROLE**: Can mint badges (Pool, Lottery contracts)
- **BADGE_ADMIN_ROLE**: Can manage templates and metadata
- **DEFAULT_ADMIN_ROLE**: Can grant/revoke roles

### Validation

- Zero address checks
- Value requirement validation
- Supply limit enforcement
- Unique badge prevention
- Array length validation

### Reentrancy Protection

All external functions use `nonReentrant` modifier to prevent reentrancy attacks.

### Emergency Pause

Admins can pause all minting operations in case of critical issues.

## Gas Optimization

### Efficient Storage

- Packed structs to minimize storage slots
- Mapping-based indexing for quick lookups
- Batch operations to reduce transaction costs

### Event-Based Tracking

- `BadgeMinted`: Track new badge awards
- `BadgeTemplateUpdated`: Template configuration changes
- `BadgeMetadataUpdated`: Metadata modifications
- `ReputationUpdated`: Reputation score changes

## Testing Coverage

The implementation includes comprehensive tests covering:

- **Deployment**: Proper initialization
- **Badge Templates**: Template management
- **Badge Minting**: Individual and batch minting
- **Badge Queries**: All query functions
- **Eligibility Checks**: Validation logic
- **Reputation System**: Score calculation
- **Metadata Management**: Update functionality
- **Emergency Controls**: Pause/unpause
- **Error Cases**: Input validation
- **Integration Scenarios**: Real-world usage
- **Gas Optimization**: Performance validation

## Usage Examples

### Create Pool Badge

```solidity
// When user creates their first pool
rewardNFT.mintBadge(
    userAddress,
    BadgeType.PoolCreator,
    poolId,
    1,
    ""
);
```

### High Yield Badge

```solidity
// When user earns significant yield
rewardNFT.mintBadge(
    userAddress,
    BadgeType.HighYielder,
    poolId,
    yieldAmount, // Must be >= 1 ETH
    abi.encode(yieldStrategy)
);
```

### Batch Achievement

```solidity
// User completes pool and wins lottery simultaneously
BadgeType[] memory types = [BadgeType.PoolCompleter, BadgeType.LotteryWinner];
uint256[] memory pools = [poolId, poolId];
uint256[] memory values = [1, prizeAmount];

rewardNFT.batchMintBadges(userAddress, types, pools, values);
```

## Future Enhancements

1. **Leaderboard System**: Full implementation of reputation leaderboards
2. **Badge Trading**: Enable secondary market for rare badges
3. **Dynamic Metadata**: IPFS-based metadata with upgradeable URIs
4. **Achievement Chains**: Complex multi-step achievements
5. **Social Features**: Badge sharing and recognition
6. **Gamification**: Seasonal events and limited-time badges

## Deployment Configuration

```typescript
// Deploy with admin address
const rewardNFT = await RewardNFTFactory.deploy(
    adminAddress,
    "Roca Badges",
    "BADGE"
);

// Grant minter role to pool contract
await rewardNFT.connect(admin).grantRole(BADGE_MINTER_ROLE, poolAddress);

// Grant minter role to lottery contract
await rewardNFT.connect(admin).grantRole(BADGE_MINTER_ROLE, lotteryAddress);
```

## Conclusion

SC-010 successfully implements a comprehensive badge system that:

✅ **Complies with ERC-721 standard**  
✅ **Implements complete IBadge interface**  
✅ **Supports 8 badge types with 5 rarity levels**  
✅ **Includes reputation scoring system**  
✅ **Provides efficient batch operations**  
✅ **Implements robust access controls**  
✅ **Includes emergency pause functionality**  
✅ **Passes comprehensive test suite**  
✅ **Ready for integration with Pool and Lottery contracts**  

The badge system enhances user engagement through gamification while maintaining security and efficiency standards required for production deployment.
