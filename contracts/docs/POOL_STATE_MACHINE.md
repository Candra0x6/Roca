# Pool Lifecycle State Machine Design

## Overview

The Roca pool lifecycle follows a deterministic state machine with four primary states. This document defines the complete state transition rules, validation conditions, and implementation requirements.

## State Machine Diagram

```
                   ┌─────────────────────────────────────────────────────────┐
                   │                    POOL LIFECYCLE                       │
                   └─────────────────────────────────────────────────────────┘

    ┌─────────────┐    joinPool()        ┌─────────────┐    startYield()      ┌─────────────┐    completePool()    ┌─────────────┐
    │             │ ─────────────────────→ │             │ ──────────────────────→ │             │ ──────────────────────→ │             │
    │    OPEN     │                      │   LOCKED    │                        │   ACTIVE    │                        │  COMPLETED  │
    │             │ ←───────────────────── │             │                        │             │                        │             │
    └─────────────┘    leavePool()       └─────────────┘                        └─────────────┘                        └─────────────┘
           │                                     │                                      │                                      │
           │                                     │                                      │                                      │
           ▼                                     ▼                                      ▼                                      ▼
    • Members join pool               • Pool is full/manually locked        • Funds generating yield           • Pool cycle completed
    • Contributions collected         • Funds transferred to YieldManager    • Lottery draws occur              • Final distribution ready
    • Members can leave freely        • Cannot join/leave anymore            • Yield accumulating               • Members withdraw shares
    • Creator can cancel pool         • Yield generation begins              • Time counting down               • Pool archived

    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                            EMERGENCY STATES                                                                            │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

              ┌─────────────┐                           ┌─────────────┐                           ┌─────────────┐
              │   PAUSED    │                           │  CANCELLED  │                           │ EMERGENCY   │
              │             │                           │             │                           │             │
              └─────────────┘                           └─────────────┘                           └─────────────┘
                     │                                         │                                         │
                     ▼                                         ▼                                         ▼
              • Temporary halt                         • Pool creation cancelled           • Emergency withdrawal mode
              • Admin intervention                     • Funds returned to members         • Admin can recover funds
              • Can resume to previous state           • No yield generated                • Bypass normal flow
```

## State Definitions

### 1. OPEN State
**Description**: Pool is accepting new members and contributions.

**Characteristics**:
- Members can join by contributing exact amount
- Members can leave and get full refund
- Pool creator can cancel the pool
- No yield generation
- Funds held in pool contract

**Entry Conditions**:
- Pool contract deployed
- Initial parameters set (contribution amount, max members, duration)
- Creator makes initial contribution (optional)

**Exit Conditions**:
- Pool reaches maximum member capacity → LOCKED
- Creator manually locks pool (minimum members met) → LOCKED
- Creator cancels pool → CANCELLED
- Emergency intervention → EMERGENCY

### 2. LOCKED State
**Description**: Pool is full and preparing for yield generation.

**Characteristics**:
- No new members allowed
- No members can leave
- Funds transferred to YieldManager
- Lottery participants registered
- Yield generation strategy selected

**Entry Conditions**:
- Pool has minimum required members (e.g., 3+)
- Either maximum capacity reached OR manual lock by creator
- All member contributions verified

**Exit Conditions**:
- YieldManager confirms fund deposit → ACTIVE
- Emergency intervention → EMERGENCY

### 3. ACTIVE State
**Description**: Pool is actively generating yield and running lottery draws.

**Characteristics**:
- Funds actively generating yield through YieldManager
- Weekly lottery draws for bonus prizes
- Yield accumulating based on chosen strategy
- Pool duration countdown active
- Members can view real-time yield progress

**Entry Conditions**:
- Funds successfully deposited to YieldManager
- Yield generation confirmed
- Lottery participants registered

**Exit Conditions**:
- Pool duration expires → COMPLETED
- Manual completion by admin (yield target met) → COMPLETED
- Emergency intervention → EMERGENCY

### 4. COMPLETED State
**Description**: Pool cycle finished, final distribution ready.

**Characteristics**:
- Final yield calculation completed
- All funds withdrawn from YieldManager
- Member shares calculated (principal + proportional yield)
- Members can withdraw their shares
- Pool becomes read-only after all withdrawals

**Entry Conditions**:
- Pool duration expired OR manual completion triggered
- All funds successfully withdrawn from YieldManager
- Final yield calculations completed

**Exit Conditions**:
- All members have withdrawn → ARCHIVED (implicit final state)
- No further state transitions possible

## Emergency States

### PAUSED State
**Purpose**: Temporary suspension of pool operations for maintenance or issue resolution.

**Triggers**:
- Admin intervention for suspected issues
- YieldManager reports problems
- Security concerns identified

**Recovery**:
- Can resume to previous state after issue resolution
- Maintains all member data and fund tracking

### CANCELLED State
**Purpose**: Pool creation was cancelled before locking.

**Triggers**:
- Creator cancels pool in OPEN state
- Insufficient participation after timeout
- Technical issues during setup

**Effects**:
- All member contributions refunded
- Pool contract becomes inactive
- No yield generation occurs

### EMERGENCY State
**Purpose**: Emergency fund recovery and member protection.

**Triggers**:
- Critical security issues
- YieldManager contract compromise
- Legal or regulatory requirements

**Powers**:
- Admin can bypass normal state transitions
- Emergency fund withdrawal from YieldManager
- Direct member refund capabilities

## State Transition Rules

### Transition Matrix

| From State | To State | Trigger | Conditions | Validation |
|------------|----------|---------|------------|------------|
| OPEN | LOCKED | `lockPool()` | min_members ≥ 3 OR max_members reached | Verify contributions, validate members |
| OPEN | CANCELLED | `cancelPool()` | Only creator, no yield generated | Refund all contributions |
| LOCKED | ACTIVE | `startYield()` | YieldManager deposit successful | Confirm fund transfer, register lottery |
| ACTIVE | COMPLETED | `completePool()` | Duration expired OR manual trigger | Withdraw from YieldManager, calculate final |
| Any | PAUSED | `pausePool()` | Admin only | Preserve current state data |
| PAUSED | Previous | `unpausePool()` | Admin only, issue resolved | Resume previous state |
| Any | EMERGENCY | `emergencyAction()` | Admin only, critical issues | Enable emergency recovery |

### Transition Functions

#### OPEN → LOCKED
```solidity
function lockPool() external {
    require(msg.sender == creator || currentMembers == maxMembers, "Unauthorized or not full");
    require(currentMembers >= minMembers, "Insufficient members");
    require(status == PoolStatus.Open, "Pool not open");
    
    // Effects
    status = PoolStatus.Locked;
    lockedAt = block.timestamp;
    
    // Interactions
    emit PoolLocked(block.timestamp, totalFunds);
    _transferToYieldManager();
    _registerLotteryParticipants();
}
```

#### LOCKED → ACTIVE
```solidity
function startYield() external onlyYieldManager {
    require(status == PoolStatus.Locked, "Pool not locked");
    require(fundsDeposited == true, "Funds not deposited");
    
    // Effects
    status = PoolStatus.Active;
    yieldStartTime = block.timestamp;
    
    // Interactions
    emit YieldGenerationStarted(block.timestamp, selectedStrategy);
}
```

#### ACTIVE → COMPLETED
```solidity
function completePool() external {
    require(
        block.timestamp >= lockedAt + duration || 
        msg.sender == admin,
        "Pool not ready for completion"
    );
    require(status == PoolStatus.Active, "Pool not active");
    
    // Effects
    status = PoolStatus.Completed;
    completedAt = block.timestamp;
    
    // Interactions
    (uint256 principal, uint256 yield) = yieldManager.withdraw(poolId);
    finalYield = yield;
    emit PoolCompleted(yield, principal + yield);
}
```

## Validation Rules

### Member Capacity Validation
```solidity
modifier validMemberCount() {
    require(currentMembers >= minMembers, "Below minimum members");
    require(currentMembers <= maxMembers, "Exceeds maximum members");
    _;
}
```

### Time-based Validation
```solidity
modifier withinDuration() {
    if (status == PoolStatus.Active) {
        require(block.timestamp <= lockedAt + duration, "Pool duration expired");
    }
    _;
}
```

### State-specific Access Control
```solidity
modifier onlyInState(PoolStatus requiredStatus) {
    require(status == requiredStatus, "Invalid state for this operation");
    _;
}

modifier notInState(PoolStatus forbiddenStatus) {
    require(status != forbiddenStatus, "Operation not allowed in current state");
    _;
}
```

## Events for State Tracking

```solidity
event StateTransition(
    PoolStatus indexed fromState,
    PoolStatus indexed toState,
    uint256 timestamp,
    address indexed triggeredBy
);

event PoolLocked(uint256 timestamp, uint256 totalFunds);
event YieldGenerationStarted(uint256 timestamp, YieldStrategy strategy);
event PoolCompleted(uint256 totalYield, uint256 finalAmount);
event PoolPaused(uint256 timestamp, string reason);
event PoolCancelled(uint256 timestamp, uint256 refundAmount);
event EmergencyActivated(uint256 timestamp, string reason);
```

## Security Considerations

### Reentrancy Protection
```solidity
modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

### Access Control by State
```solidity
mapping(PoolStatus => mapping(bytes4 => bool)) public allowedFunctions;

modifier onlyAllowedInState(bytes4 selector) {
    require(allowedFunctions[status][selector], "Function not allowed in current state");
    _;
}
```

### Emergency Circuit Breaker
```solidity
modifier whenNotPaused() {
    require(status != PoolStatus.Paused, "Pool is paused");
    _;
}

modifier emergencyOnly() {
    require(hasRole(EMERGENCY_ROLE, msg.sender), "Emergency role required");
    _;
}
```

## Gas Optimization Strategies

### State Packing
```solidity
struct PoolState {
    PoolStatus status;      // 1 byte
    uint32 currentMembers;  // 4 bytes
    uint32 maxMembers;      // 4 bytes
    uint32 createdAt;       // 4 bytes
    uint32 lockedAt;        // 4 bytes
    uint32 completedAt;     // 4 bytes
    bool emergencyMode;     // 1 byte
    // Total: 24 bytes (fits in single storage slot with padding)
}
```

### Efficient State Checks
```solidity
function canJoin() external view returns (bool) {
    return status == PoolStatus.Open && currentMembers < maxMembers;
}

function canLock() external view returns (bool) {
    return status == PoolStatus.Open && 
           currentMembers >= minMembers && 
           (currentMembers == maxMembers || msg.sender == creator);
}

function canComplete() external view returns (bool) {
    return status == PoolStatus.Active && 
           (block.timestamp >= lockedAt + duration || hasRole(ADMIN_ROLE, msg.sender));
}
```

## Implementation Guidelines

### State Machine Library
```solidity
library PoolStateMachine {
    function validateTransition(
        PoolStatus from,
        PoolStatus to,
        address caller,
        PoolInfo memory pool
    ) internal pure returns (bool valid, string memory reason) {
        // Transition validation logic
        // Returns validity and reason for any failures
    }
    
    function getValidTransitions(PoolStatus current) 
        internal pure returns (PoolStatus[] memory) {
        // Returns array of valid next states
    }
}
```

### Integration with Frontend
```solidity
function getPoolProgress() external view returns (
    PoolStatus currentStatus,
    uint256 progressPercentage,
    uint256 timeRemaining,
    string memory statusDescription,
    string[] memory availableActions
) {
    // Comprehensive pool status for UI
}
```

## Testing Requirements

### State Transition Tests
1. Test all valid state transitions
2. Test all invalid state transitions (should revert)
3. Test emergency state transitions
4. Test time-based automatic transitions
5. Test access control for each transition

### Edge Cases
1. Pool duration expires during LOCKED state
2. YieldManager failure during LOCKED → ACTIVE
3. Emergency withdrawal in each state
4. Member withdrawal races in COMPLETED state
5. Gas limit scenarios for large member pools

### Integration Tests
1. Full lifecycle: OPEN → LOCKED → ACTIVE → COMPLETED
2. Cancellation flows: OPEN → CANCELLED
3. Emergency flows: Any → EMERGENCY → Recovery
4. Pause/resume flows: Any → PAUSED → Previous

This state machine design ensures robust, secure, and efficient pool lifecycle management for the Roca platform.
