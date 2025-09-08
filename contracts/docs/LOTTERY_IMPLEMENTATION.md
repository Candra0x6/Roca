# LotteryManager Implementation (SC-008)

## Overview

The LotteryManager contract implements a decentralized lottery system for the Roca platform, providing weekly bonus draws for pool participants with pseudo-randomness for MVP deployment.

## Key Features

### Core Lottery Functionality
- **Weekly Draws**: Configurable draw intervals (default: 7 days)
- **Fair Selection**: Weighted pseudo-random winner selection
- **Prize Distribution**: Automatic ETH prize distribution to winners
- **Pool Integration**: Seamless integration with Pool contracts

### Randomness Implementation
- **Pseudo-Random Selection**: Uses `blockhash()`, `block.timestamp`, and `block.prevrandao`
- **Weighted Distribution**: Participants have different chances based on contribution amounts
- **Fair Algorithm**: Ensures all eligible participants have proportional chances

### Security Features
- **Access Control**: Role-based permissions using OpenZeppelin AccessControl
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Emergency Controls**: Pause functionality and emergency withdrawal
- **Input Validation**: Comprehensive parameter validation

## Contract Architecture

### Main Components

1. **Draw Management**: Request, select winner, distribute prizes
2. **Participant Management**: Add/remove participants, weight calculation
3. **Configuration**: Lottery parameters and admin controls
4. **Prize Calculation**: Dynamic prize amounts based on pool size
5. **Emergency Functions**: Pause, emergency withdrawal, admin controls

### State Variables

```solidity
struct LotteryDraw {
    uint256 drawId;
    uint256 poolId;
    address winner;
    uint256 prizeAmount;
    uint256 drawTime;
    uint256 totalParticipants;
    bytes32 randomSeed;
    bool isPaidOut;
}

struct LotteryConfig {
    uint256 drawInterval;      // 7 days default
    uint256 prizePercentage;   // 10% default (1000 basis points)
    uint256 minPoolSize;       // 5 participants minimum
    uint256 maxPrizeAmount;    // 10 ETH maximum
    bool isActive;
}
```

## Core Functions

### Draw Management

#### `requestDraw(uint256 poolId)`
- **Purpose**: Initiates a new lottery draw for a pool
- **Access**: POOL_ROLE only
- **Requirements**: Pool must be eligible, sufficient time since last draw
- **Events**: `DrawRequested`

#### `selectWinner(uint256 drawId)`
- **Purpose**: Selects a random winner using weighted selection
- **Access**: Public (anyone can trigger after delay)
- **Algorithm**: Weighted pseudo-random selection
- **Events**: `BonusWinnerSelected`

#### `distributePrize(uint256 drawId)`
- **Purpose**: Distributes prize to the selected winner
- **Access**: Public
- **Requirements**: Winner must be selected, sufficient contract balance
- **Events**: `PrizePaidOut`

### Participant Management

#### `addParticipants(uint256 poolId, address[] participants, uint256[] weights)`
- **Purpose**: Registers pool participants for lottery eligibility
- **Access**: POOL_ROLE only
- **Validation**: Array length matching, non-empty arrays
- **Events**: `ParticipantAdded`

#### `removeParticipant(uint256 poolId, address participant)`
- **Purpose**: Removes a participant from lottery (when leaving pool)
- **Access**: POOL_ROLE only
- **Effect**: Sets participant as ineligible
- **Events**: None (internal operation)

### Configuration

#### `updateLotteryConfig(LotteryConfig config)`
- **Purpose**: Updates lottery parameters
- **Access**: LOTTERY_ADMIN_ROLE only
- **Validation**: Reasonable parameter bounds
- **Events**: `LotteryConfigUpdated`

## Integration with Pool System

### Pool Lifecycle Integration
1. **Pool Creation**: No lottery interaction needed
2. **Pool Locking**: Pool calls `addParticipants()` with member list
3. **Pool Active**: Regular `requestDraw()` calls (weekly)
4. **Pool Completion**: Participants remain eligible until completion

### Role Management
- **POOL_ROLE**: Granted to Pool contracts for participant management
- **LOTTERY_ADMIN_ROLE**: Granted to admins for configuration
- **DEFAULT_ADMIN_ROLE**: Emergency functions and role management

## Prize Calculation

### Algorithm
```solidity
prizeAmount = (participantCount * 0.01 ether * prizePercentage) / 10000;
if (prizeAmount > maxPrizeAmount) {
    prizeAmount = maxPrizeAmount;
}
```

### Default Configuration
- **Base Prize**: 0.01 ETH per participant
- **Prize Percentage**: 10% of calculated amount
- **Maximum Prize**: 10 ETH per draw
- **Minimum Pool Size**: 5 participants

## Randomness Implementation

### Entropy Sources
1. `blockhash(block.number - 1)`: Previous block hash
2. `block.timestamp`: Current timestamp
3. `block.prevrandao`: Ethereum 2.0 randomness beacon
4. `drawId`: Unique draw identifier
5. `poolId`: Pool identifier
6. `participants.length`: Number of participants

### Selection Algorithm
```solidity
bytes32 randomSeed = keccak256(abi.encodePacked(
    blockhash(block.number - 1),
    block.timestamp,
    block.prevrandao,
    drawId,
    poolId,
    participants.length
));

uint256 randomValue = uint256(randomSeed) % totalWeight;
// Select winner based on cumulative weights
```

## Security Considerations

### Access Control
- Role-based permissions for all sensitive operations
- Pool contracts must be explicitly granted POOL_ROLE
- Admin functions protected by LOTTERY_ADMIN_ROLE

### Reentrancy Protection
- `nonReentrant` modifier on prize distribution
- Checks-effects-interactions pattern
- State updates before external calls

### Emergency Functions
- `emergencyPause()`: Stops all lottery operations
- `emergencyWithdraw()`: Admin can withdraw ETH
- `setLotteryActive()`: Toggle lottery system

### Input Validation
- Parameter bounds checking
- Array length validation
- Zero address prevention
- Overflow protection (Solidity 0.8.30)

## Gas Optimization

### Storage Efficiency
- Packed structs where possible
- Minimal storage operations
- Efficient participant lookup

### Function Optimization
- View functions for data retrieval
- Batch operations support
- Early returns for invalid conditions

## Testing Coverage

### Test Scenarios
1. **Deployment**: Configuration validation, role assignment
2. **Participant Management**: Add/remove participants, validation
3. **Pool Eligibility**: Size requirements, active status
4. **Draw Management**: Request timing, validation
5. **Winner Selection**: Randomness, weighted selection
6. **Prize Distribution**: ETH transfers, state updates
7. **Configuration**: Parameter updates, validation
8. **Emergency Functions**: Pause, withdrawal, access control
9. **Complete Lifecycle**: End-to-end lottery process

### Test Results
- ✅ All core functionality tests passing
- ✅ Contract compiles without warnings
- ✅ Gas optimization verified
- ✅ Security patterns implemented

## Deployment Instructions

1. Deploy LotteryManager with admin address
2. Grant POOL_ROLE to Pool contract addresses
3. Configure lottery parameters if different from defaults
4. Fund contract with ETH for prize distribution
5. Integrate with Pool contracts for participant management

## Future Enhancements

### Production Considerations
- **Chainlink VRF**: Replace pseudo-randomness with verifiable randomness
- **Yield Integration**: Dynamic prize calculation from actual pool yields
- **Multi-token Support**: Support for different prize token types
- **Advanced Weighting**: More sophisticated participant weighting algorithms

### Monitoring and Analytics
- **Draw History**: Comprehensive lottery history tracking
- **Statistics**: Winner distribution analysis
- **Performance Metrics**: Gas usage and efficiency tracking

## Conclusion

The LotteryManager contract successfully implements task SC-008, providing a robust, secure, and gas-efficient lottery system for the Roca platform. The implementation uses pseudo-randomness suitable for MVP deployment while maintaining fairness through weighted selection and comprehensive security measures.
