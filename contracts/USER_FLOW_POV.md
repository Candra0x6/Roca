# Roca User Flow by Point of View (POV)

This document provides detailed user flows from different perspectives, showing exactly which functions each type of user calls throughout their journey in the Roca platform.

## Table of Contents
1. [Pool Creator Journey](#pool-creator-journey)
2. [Pool Member Journey](#pool-member-journey)
3. [Admin/Platform Manager Journey](#adminplatform-manager-journey)
4. [Lottery Participant Journey](#lottery-participant-journey)
5. [Yield Manager Journey](#yield-manager-journey)
6. [Badge Collector Journey](#badge-collector-journey)
7. [Integration Flows](#integration-flows)

---

## Pool Creator Journey

### 🎯 **Goal**: Create and manage a savings pool

### **Phase 1: Pre-Creation Setup**
```
👤 Pool Creator POV: "I want to create a savings pool for my community"
```

**Functions Called:**
1. **Check Eligibility** (Optional)
   ```solidity
   // Check if I can create a pool
   (bool canCreate, string reason) = poolFactory.canCreatePool(creatorAddress);
   ```

2. **Get Current Constraints** (Optional)
   ```solidity
   // Check factory limits
   GlobalConstraints memory constraints = poolFactory.getGlobalConstraints();
   ```

### **Phase 2: Pool Creation**
```
👤 Pool Creator POV: "I'm ready to deploy my pool"
```

**Functions Called:**
1. **Create Pool**
   ```solidity
   // Main creation call
   (uint256 poolId, address poolAddress) = poolFactory.createPool({
     name: "My Community Pool",
     contributionAmount: 0.1 ether,
     maxMembers: 10,
     duration: 30 days,
     yieldManager: yieldManagerAddress,
     badgeContract: rewardNftAddress
   });
   ```

**What Happens Behind the Scenes:**
- Pool contract is deployed
- Creator automatically gets `POOL_CREATOR_ROLE` on their pool
- Creator badge is minted via `RewardNFT.mintBadge()`

### **Phase 3: Pool Management**
```
👤 Pool Creator POV: "I need to manage my pool as members join"
```

**Functions Called:**
1. **Monitor Pool Status**
   ```solidity
   // Check current pool state
   PoolInfo memory info = pool.getPoolInfo();
   address[] memory members = pool.getMembers();
   uint256 memberCount = pool.getCurrentMembers();
   ```

2. **Lock Pool When Ready**
   ```solidity
   // Lock the pool to start yield generation
   pool.lockPool();
   ```

3. **Update Yield Periodically**
   ```solidity
   // Refresh yield calculations
   pool.updateYield();
   ```

4. **Complete Pool at End**
   ```solidity
   // Finalize the pool
   pool.completePool();
   ```

### **Phase 4: Post-Completion**
```
👤 Pool Creator POV: "My pool is complete, time to withdraw my share"
```

**Functions Called:**
1. **Withdraw Share**
   ```solidity
   // Get my principal + yield
   pool.withdrawShare();
   ```

2. **Check My Creator Stats** (Optional)
   ```solidity
   // See all my pools
   address[] memory myPools = poolFactory.getCreatorPools(creatorAddress);
   ```

---

## Pool Member Journey

### 🎯 **Goal**: Join a pool, earn yield, and collect badges

### **Phase 1: Discovery**
```
👤 Pool Member POV: "I want to find and join a savings pool"
```

**Functions Called:**
1. **Browse Available Pools**
   ```solidity
   // Get all pools
   Pool[] memory allPools = poolFactory.getAllPools();
   
   // Check specific pool details
   PoolInfo memory poolInfo = pool.getPoolInfo();
   ```

2. **Check Pool Eligibility**
   ```solidity
   // Verify I can join
   uint256 requiredAmount = poolInfo.contributionAmount;
   bool isOpen = (poolInfo.status == PoolStatus.Open);
   bool hasSpace = (poolInfo.currentMembers < poolInfo.maxMembers);
   ```

### **Phase 2: Joining**
```
👤 Pool Member POV: "I found a good pool, let me join"
```

**Functions Called:**
1. **Join Pool**
   ```solidity
   // Send exact contribution amount
   pool.joinPool{value: contributionAmount}();
   ```

**What Happens Behind the Scenes:**
- Membership is recorded
- Member badge is minted via `RewardNFT.mintBadge()`
- Pool may auto-lock if max members reached

### **Phase 3: Active Participation**
```
👤 Pool Member POV: "I'm in the pool, let me track my progress"
```

**Functions Called:**
1. **Monitor My Status**
   ```solidity
   // Check my membership details
   PoolMember memory myInfo = pool.getMemberInfo(memberAddress);
   
   // Check if I'm actually a member
   bool isMember = pool.isMember(memberAddress);
   ```

2. **Track Pool Progress**
   ```solidity
   // Monitor pool performance
   uint256 currentYield = pool.getYieldPerMember();
   uint256 totalValue = pool.getTotalValue();
   uint256 timeLeft = pool.getTimeRemaining();
   ```

3. **Emergency Exit** (Only before lock)
   ```solidity
   // Leave pool if needed (only when Open)
   pool.leavePool();
   ```

### **Phase 4: Completion & Withdrawal**
```
👤 Pool Member POV: "Pool is complete, time to get my money back with yield"
```

**Functions Called:**
1. **Withdraw Final Share**
   ```solidity
   // Get principal + yield
   pool.withdrawShare();
   ```

**What Happens Behind the Scenes:**
- Pool completion badge may be minted
- High yield badges may be awarded

### **Phase 5: Badge Collection**
```
👤 Pool Member POV: "Let me check what badges I earned"
```

**Functions Called:**
1. **Check My Badges**
   ```solidity
   // Get all my badges
   uint256[] memory myBadges = rewardNft.getUserBadges(memberAddress);
   
   // Get badge statistics
   UserBadgeStats memory stats = rewardNft.getUserBadgeStats(memberAddress);
   ```

---

## Admin/Platform Manager Journey

### 🎯 **Goal**: Manage the platform, ensure security, and handle emergencies

### **Phase 1: Initial Setup**
```
👤 Admin POV: "I need to configure the platform"
```

**Functions Called:**
1. **Grant Roles**
   ```solidity
   // Grant pool creator roles
   poolFactory.grantPoolCreatorRole(userAddress);
   
   // Grant minter roles to contracts
   rewardNft.grantRole(BADGE_MINTER_ROLE, poolFactoryAddress);
   rewardNft.grantRole(BADGE_MINTER_ROLE, lotteryManagerAddress);
   ```

2. **Configure Platform Constraints**
   ```solidity
   // Set global limits
   poolFactory.updateGlobalConstraints({
     maxTotalPools: 1000,
     maxPoolsPerCreator: 10,
     maxActivePoolsPerCreator: 3,
     minTimeBetweenPools: 1 days,
     enforceConstraints: true
   });
   ```

### **Phase 2: Ongoing Management**
```
👤 Admin POV: "I need to monitor and manage the platform"
```

**Functions Called:**
1. **Monitor Platform Health**
   ```solidity
   // Check platform statistics
   uint256 totalPools = poolFactory.getPoolCount();
   Pool[] memory allPools = poolFactory.getAllPools();
   ```

2. **Emergency Controls**
   ```solidity
   // Pause factory if needed
   poolFactory.setPaused(true);
   
   // Emergency withdraw from specific pool
   pool.emergencyWithdraw(memberAddress);
   
   // Update pool status manually
   poolFactory.updatePoolStatus(poolAddress, newStatus);
   ```

3. **Role Management**
   ```solidity
   // Revoke access if needed
   poolFactory.revokePoolCreatorRole(userAddress);
   
   // Grant admin roles
   pool.grantRole(EMERGENCY_ADMIN_ROLE, adminAddress);
   ```

### **Phase 3: Lottery Management**
```
👤 Admin POV: "I need to manage lottery draws"
```

**Functions Called:**
1. **Configure Lottery**
   ```solidity
   // Set lottery parameters
   lotteryManager.updateConfig({
     drawInterval: 7 days,
     basePrizePercentage: 500, // 5%
     maxParticipants: 100,
     minPoolValue: 1 ether
   });
   ```

2. **Manual Draw Management**
   ```solidity
   // Trigger winner selection if needed
   lotteryManager.selectWinner(drawId);
   
   // Distribute prizes
   lotteryManager.distributePrize(drawId);
   ```

---

## Lottery Participant Journey

### 🎯 **Goal**: Participate in lottery draws and win prizes

### **Phase 1: Automatic Participation**
```
👤 Pool Member POV: "I want to be eligible for lottery prizes"
```

**Functions Called:**
- No direct calls needed - participation happens automatically when:
  - Pool reaches Active status
  - Lottery system calls `lotteryManager.addParticipants()`

### **Phase 2: Monitoring Draws**
```
👤 Lottery Participant POV: "I want to track lottery activity"
```

**Functions Called:**
1. **Check Draw History**
   ```solidity
   // Get draws for my pool
   uint256[] memory drawIds = lotteryManager.getPoolDraws(poolId);
   
   // Get specific draw details
   LotteryDraw memory draw = lotteryManager.getDraw(drawId);
   ```

2. **Check My Participation**
   ```solidity
   // See my lottery participation
   Participant[] memory participants = lotteryManager.getPoolParticipants(poolId);
   ```

### **Phase 3: Prize Collection**
```
👤 Lottery Winner POV: "I won! How do I claim my prize?"
```

**Functions Called:**
- No direct calls needed - prizes are automatically distributed
- Winner badge is automatically minted

**What Happens Behind the Scenes:**
1. `lotteryManager.selectWinner(drawId)` - admin or automated
2. `lotteryManager.distributePrize(drawId)` - admin or automated
3. Winner badge minted via `RewardNFT.mintBadge()`

---

## Yield Manager Journey

### 🎯 **Goal**: Manage pool funds and generate yield

### **Phase 1: Pool Integration**
```
👤 Yield Manager POV: "A pool wants to deposit funds for yield generation"
```

**Functions Called:**
1. **Receive Deposits**
   ```solidity
   // Called by Pool contract
   yieldManager.deposit{value: poolFunds}(poolId, YieldStrategy.MockYield);
   ```

### **Phase 2: Yield Management**
```
👤 Yield Manager POV: "I need to manage and update yields"
```

**Functions Called:**
1. **Update Single Pool Yield**
   ```solidity
   // Update yield for one pool
   yieldManager.updateYield(poolId);
   ```

2. **Batch Update Yields**
   ```solidity
   // Update multiple pools efficiently
   uint256[] memory poolIds = [1, 2, 3, 4, 5];
   yieldManager.batchUpdateYield(poolIds);
   ```

3. **Check Yield Status**
   ```solidity
   // Get current yield
   uint256 currentYield = yieldManager.getYield(poolId);
   uint256 totalValue = yieldManager.getTotalValue(poolId);
   uint256 apy = yieldManager.getCurrentAPY(poolId);
   ```

### **Phase 3: Withdrawals**
```
👤 Yield Manager POV: "Pool is complete, time to return funds"
```

**Functions Called:**
1. **Process Withdrawal**
   ```solidity
   // Called by Pool contract
   (uint256 principal, uint256 yield) = yieldManager.withdraw(poolId);
   ```

---

## Badge Collector Journey

### 🎯 **Goal**: Collect and showcase achievement badges

### **Phase 1: Badge Discovery**
```
👤 Badge Collector POV: "I want to see what badges I can earn"
```

**Functions Called:**
1. **Browse Badge Types**
   ```solidity
   // Check badge eligibility
   bool eligible = rewardNft.isEligibleForBadge(myValue);
   bool canMint = rewardNft.canMintBadge(BadgeType.HighYielder);
   ```

### **Phase 2: Badge Collection**
```
👤 Badge Collector POV: "I want to track my badge collection"
```

**Functions Called:**
1. **Check My Collection**
   ```solidity
   // Get all my badges
   uint256[] memory myBadges = rewardNft.getUserBadges(collectorAddress);
   
   // Get detailed badge info
   for (uint256 i = 0; i < myBadges.length; i++) {
     BadgeInfo memory badge = rewardNft.getBadgeInfo(myBadges[i]);
   }
   ```

2. **Check Collection Stats**
   ```solidity
   // Get my statistics
   UserBadgeStats memory stats = rewardNft.getUserBadgeStats(collectorAddress);
   ```

3. **Browse Badge Categories**
   ```solidity
   // See badges by type
   uint256[] memory creatorBadges = rewardNft.getBadgesByType(BadgeType.PoolCreator);
   
   // See badges by rarity
   uint256[] memory rareBadges = rewardNft.getBadgesByRarity(BadgeRarity.Rare);
   ```

---

## Integration Flows

### **Frontend Application Integration**
```
👤 Frontend Developer POV: "I need to integrate with these contracts"
```

**Common Integration Pattern:**
1. **Read-Only Queries** (No gas cost)
   ```javascript
   // Get pool information
   const poolInfo = await pool.getPoolInfo();
   const members = await pool.getMembers();
   const userBadges = await rewardNft.getUserBadges(userAddress);
   ```

2. **Write Operations** (Requires wallet signature)
   ```javascript
   // Join pool with MetaMask
   const tx = await pool.connect(signer).joinPool({ 
     value: ethers.utils.parseEther('0.1') 
   });
   await tx.wait();
   ```

### **Backend/Automation Integration**
```
👤 Backend Developer POV: "I need to automate platform operations"
```

**Automation Scripts:**
1. **Yield Updates** (Cron job)
   ```javascript
   // Daily yield updates
   const activePools = await getActivePools();
   for (const poolId of activePools) {
     await yieldManager.updateYield(poolId);
   }
   ```

2. **Lottery Draws** (Weekly cron)
   ```javascript
   // Weekly lottery processing
   const pendingDraws = await getPendingDraws();
   for (const drawId of pendingDraws) {
     await lotteryManager.selectWinner(drawId);
     await lotteryManager.distributePrize(drawId);
   }
   ```

### **Mobile App Integration**
```
👤 Mobile Developer POV: "I need lightweight contract interactions"
```

**Optimized Calls:**
1. **Batch Data Fetching**
   ```javascript
   // Get user dashboard data in minimal calls
   const [poolInfo, memberInfo, badges, stats] = await Promise.all([
     pool.getPoolInfo(),
     pool.getMemberInfo(userAddress),
     rewardNft.getUserBadges(userAddress),
     rewardNft.getUserBadgeStats(userAddress)
   ]);
   ```

---

## Summary of Key Function Categories

### **State-Changing Functions** (Require Gas)
- `poolFactory.createPool()` - Pool creation
- `pool.joinPool()` - Join pool with payment
- `pool.leavePool()` - Leave before lock
- `pool.lockPool()` - Start yield generation
- `pool.completePool()` - Finalize pool
- `pool.withdrawShare()` - Withdraw funds
- `yieldManager.deposit()` - Deposit for yield
- `yieldManager.withdraw()` - Withdraw with yield
- `lotteryManager.selectWinner()` - Select lottery winner
- `rewardNft.mintBadge()` - Mint achievement badge

### **View Functions** (No Gas Cost)
- All `get*()` functions for data queries
- All `is*()` and `can*()` functions for status checks
- Badge browsing and statistics functions
- Pool member and creator queries

### **Admin Functions** (Restricted Access)
- Role management functions
- Emergency controls
- Configuration updates
- Manual status changes

This document provides a comprehensive view of how different users interact with the Roca platform, showing the exact functions they call and when they call them throughout their journey.
