# Roca Contracts — User Interaction Guide

This document explains how end users (creators, members, admins) and integrators (frontend, scripts) interact with the smart contracts in this repository. It lists the primary user-facing functions for each contract and gives short examples for calls (ethers.js / Hardhat).

## Quick checklist
- Create a pool (creator) — `PoolFactory.createPool`
- Join / leave / lock / complete pool (members & creator) — `Pool.joinPool`, `Pool.leavePool`, `Pool.lockPool`, `Pool.completePool`
- Withdraw share after completion (members) — `Pool.withdrawShare`
- Yield operations (pool -> yield manager) — `YieldManager.deposit`, `YieldManager.updateYield`, `YieldManager.withdraw`
- Lottery flows (pool + lottery) — `LotteryManager.requestDraw`, `LotteryManager.addParticipants`, `LotteryManager.selectWinner`, `LotteryManager.distributePrize`
- Badges (minting and queries) — `RewardNFT.mintBadge`, `RewardNFT.batchMintBadges`, `IBadge` getters
- Admin actions — role granting, pausing, configuration updates

---

## Roles and who calls what
- DEFAULT_ADMIN_ROLE — deployer / platform admin: manages other roles and emergency actions.
- POOL_CREATOR_ROLE — accounts allowed to call `PoolFactory.createPool`.
- FACTORY_ROLE — `Pool` instances expect the factory to call certain initialization-only functions.
- BADGE_MINTER_ROLE / MINTER_ROLE — contracts (Pool, Lottery) allowed to mint NFTs.
- LOTTERY_ADMIN_ROLE / BADGE_ADMIN_ROLE / EMERGENCY_ADMIN_ROLE / STRATEGY_MANAGER_ROLE — admin capabilities per contract.

## Contract by contract — user-facing functions

Note: parameter types are abbreviated. See contract ABIs for full types.

### PoolFactory (creator & admin)
- createPool(PoolCreationParams params) -> (poolId, poolAddress)
- setPaused(bool paused)
- grantPoolCreatorRole(address)
- revokePoolCreatorRole(address)
- updateGlobalConstraints(GlobalConstraints)
- updatePoolStatus(address poolAddress, IPool.PoolStatus newStatus)
- getPool(uint256 poolId)
- getCreatorPools(address)
- getAllPools()
- getPoolCount()
- canCreatePool(address) -> (bool, string)
- getBadgeContract()

When to call: creators call `createPool` to deploy a new Pool. Admins call the pause/update functions.

Example (ethers.js):
```js
const tx = await poolFactory.createPool({
  name: "My Pool",
  contributionAmount: ethers.utils.parseEther('0.1'),
  maxMembers: 10,
  duration: 30 * 24 * 60 * 60, // 30 days
  yieldManager: yieldManagerAddress,
  badgeContract: rewardNftAddress
});
await tx.wait();
```

### Pool (members & creator)
- joinPool() payable — member joins by sending the required contribution
- leavePool() — leave while pool is Open
- lockPool() — called by creator to lock pool once members are filled
- completePool() — finalize pool (trigger yields/closure)
- withdrawShare() — members withdraw principal + yield after completion
- emergencyWithdraw(address member) — admin emergency action
- updateYield() — calls yield manager to refresh yields
- getPoolInfo(), getMemberInfo(address), getMembers(), isMember(address)
- getYieldPerMember(), getTimeRemaining(), getTotalValue(), getPoolId(), getBadgeContract()

When to call: members call `joinPool` (payable) to participate; creator calls `lockPool` and `completePool` at lifecycle points; members call `withdrawShare` after completion.

Example (join):
```js
const tx = await pool.connect(memberSigner).joinPool({ value: ethers.utils.parseEther('0.1') });
await tx.wait();
```

Example (withdraw):
```js
const tx = await pool.connect(memberSigner).withdrawShare();
await tx.wait();
```

### RewardNFT / Badge (badge minting & queries)
- mintBadge(address recipient, BadgeType badgeType, uint256 poolId, uint256 value, bytes achievementData)
- batchMintBadges(...) // batch minting variant
- getBadgeInfo(uint256 tokenId), getUserBadges(address), getUserBadgeStats(address)
- getBadgesByType(BadgeType), getBadgesByRarity(BadgeRarity)
- isEligibleForBadge(uint256 value), canMintBadge(BadgeType)
- getNextTokenId()

Who calls: Pools and LotteryManager hold the minter role and call `mintBadge` to reward users. Frontends read badge data using the getters.

Example (mint called by Pool contract):
```js
// From a factory/pool contract context (off-chain script or another contract call via factory)
await rewardNft.connect(minterSigner).mintBadge(userAddress, BadgeType.PoolMember, poolId, contributionAmount, "0x");
```

Example (read badges):
```js
const badges = await rewardNft.getUserBadges(userAddress);
```

### LotteryManager (pool & admin)
- requestDraw(uint256 poolId, uint256 poolYield) — pool requests a draw
- addParticipants(uint256[] weights) — pool provides participant weights
- selectWinner(uint256 drawId) — executes winner selection
- distributePrize(uint256 drawId) — transfer prize to winner
- calculatePrizeAmount(uint256 poolId, uint256 poolYield)
- fundPrizePool(uint256 poolId) payable — top up pool-specific prize funds
- getDraw(uint256 drawId), getPoolDraws(uint256 poolId), getPoolParticipants(uint256 poolId)
- setBadgeContract(address), getBadgeContract()

When to call: Pools call `requestDraw` periodically; Lottery admin may call `selectWinner` and `distributePrize` or these can be automated via cron/keeper.

Example (request draw):
```js
await lotteryManager.connect(poolSigner).requestDraw(poolId, currentPoolYield);
```

### YieldManager / MockYieldManager (pool -> yield provider)
- deposit(uint256 poolId, YieldStrategy strategy) payable — transfer pool funds to yield manager
- withdraw(uint256 poolId) -> (principal, yield)
- updateYield(uint256 poolId), batchUpdateYield(poolIds)
- getYield(uint256 poolId), getTotalValue(uint256 poolId), calculateProjectedYield(params)
- getCurrentAPY(uint256)

When to call: `Pool` will call `deposit` when locking/completing; off-chain scripts or keepers may call `updateYield` to refresh yield accounting. Admins configure strategies.

Example (deposit):
```js
await yieldManager.connect(poolSigner).deposit(poolId, YieldStrategy.MockYield, { value: totalPoolFunds });
```

### MockYieldManager (testing)
- Same public interface as `YieldManager`; useful for local/dev tests. It exposes helpers like `addYield(poolId, amount)` for testing.

---

## Common integration patterns

- Frontend (web/wagmi): use read calls for getters (non-payable) and write calls for state changes. Set up wallet connection and request signatures for payable functions.
- Backend scripts / Hardhat tasks: used to automate administrative or lifecycle steps (e.g., nightly lottery draws, updating yields).
- Roles: ensure the correct addresses have the required roles. Use `grantRole` from `AccessControl` as DEFAULT_ADMIN.

## Enumerations & data shapes
- BadgeType, BadgeRarity, PoolStatus, YieldStrategy are enums used throughout. Read the `interfaces/` folder in `contracts/` for exact definitions.

## Troubleshooting & tips
- Payable functions require correct `value`. Always use `ethers.utils.parseEther` to build amounts.
- NFT metadata is stored via token URI fields; `setBaseURI` / `setTokenURI` functions control metadata.
- Many functions are gated by `whenNotPaused` or role checks. Check contract roles before calling.

## Where to look next
- Scripts in `scripts/` (e.g., `deploy-dev.ts`, `deploy-all-contracts.ts`) show how contracts are deployed and wired together.
- Frontend in `web/` uses wagmi/connectors to call these contracts.

## Summary
This repository exposes lifecycle functions for pools, yield management, lottery draws, and badge minting. Creators primarily interact with `PoolFactory` and `Pool` methods; members interact with `Pool.joinPool`, `Pool.withdrawShare` and read-only getters; admins use role and config functions for governance. Badge minting is done by contracts with the minter role through `RewardNFT.mintBadge`.
