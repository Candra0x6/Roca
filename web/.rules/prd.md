

# 📋 **Project PRD — Arisan+ (On-Chain DeFi Yield Pool + Gamification)**

---

## **1. Problem Statement**

* In many emerging markets (Asia, Africa, Latin America), **Arisan / ROSCA (Rotating Savings and Credit Associations)** is a common way to save money socially.
* Traditional Arisan faces problems:

  * **Trust issue**: Organizers may run away with the money.
  * **Lack of transparency**: Hard to verify fairness of shuffling.
  * **Limited benefit**: Members just get lump sum, no growth of capital.
* Blockchain & DeFi can solve this by **automating fund custody, yield generation, and fair randomization**.

---

## **2. Goal & Purpose**

Build **Arisan+**, a **decentralized social saving platform** that combines:

1. **Arisan spirit** → community pooling, fairness, trustless rules.
2. **DeFi yields** → funds are staked in protocols (e.g., Marinade) to earn interest.
3. **Gamification** → weekly bonus lottery, badges, and NFTs for engagement.

Purpose:

* Encourage **social saving culture** in crypto-native way.
* Provide **safe, transparent, trustless Arisan**.
* Make saving **fun and rewarding**.

---

## **3. Target Users**

* **Crypto-savvy communities** (friends, DAOs, small guilds).
* **Emerging market users** already familiar with ROSCA/Arisan.
* **DeFi users** who want yield + fun gamification.

---

## **4. Core Value Proposition**

* **Trustless**: Smart contract manages funds, no human organizer.
* **Yield + Fun**: Everyone earns yield; weekly bonuses keep excitement alive.
* **Social + Transparent**: Pools visible on-chain, fair random draws.
* **Gamified Savings**: Collect badges, win prizes, share with friends.

---

## **5. Scope & Features**

### **MVP Features**

1. **Wallet Connect (solidity, Phantom)**
2. **Create/Join Pool** with parameters: contribution, pool size, duration.
4. **Weekly Bonus Lottery** (on-chain RNG).
5. **Dashboard** for active pools, yield, and badges.
6. **End Pool Distribution**: principal + yield + prizes returned.
7. **Badges/NFTs** for gamification.

### **Future Features (V2)**

* Cross-chain pools.
* Mobile app.
* Social features: chat inside pool, invite friends.
* Sponsored prize pools.

---
Got it 👍 Let me **rework the complete Smart Contract Implementation PRD** so it’s clean, consistent, and structured enough for development handoff — but still **without actual Solidity code**.

Here’s the polished version:

---

# ⚙️ **Smart Contract Implementation PRD — Arisan+ (DeFi Yield Pool + Gamification)**

---

## **1. Architecture Overview**

Arisan+ is structured as **modular contracts** for maintainability and upgradeability:

1. **PoolFactory** → Creates and tracks pools.
2. **Pool** → Core logic for each group (funds, members, payouts).
3. **YieldManager** → Staking integration with DeFi yield protocols.
4. **LotteryManager (RNG)** → Randomized weekly winner selection.
5. **RewardNFT** → Gamification through badges/collectibles.
6. **Treasury (optional)** → Fee collection and sponsored rewards.

---

## **2. Contract Roles & Responsibilities**

### **2.1 PoolFactory**

* **Role**: Entry point for pool creation.
* **Responsibilities**:

  * `createPool(params)` → Deploy new Pool contract.
  * Maintain registry of active pools.
  * Enforce global constraints (max size, whitelisted tokens, etc).
* **Events**:

  * `PoolCreated(address pool, address creator, uint256 poolId)`.

---

### **2.2 Pool**

* **Role**: Represents a single Arisan+ group.
* **Core Data Structures**:

  * `members[]` → List of participant addresses.
  * `contributionAmount` → Fixed per-member contribution.
  * `poolBalance` → Locked principal.
  * `yieldAccrued` → Yield from YieldManager.
  * `bonusHistory[]` → Weekly winner records.
* **Responsibilities**:

  * Member management → `joinPool()`, `leavePool()` (before lock).
  * Funds → Collect contributions, stake via YieldManager.
  * Weekly draws → Request RNG from LotteryManager.
  * Completion → Distribute principal + yield + bonus.
* **Events**:

  * `MemberJoined(address member)`.
  * `PoolLocked(uint256 startTime, uint256 endTime)`.
  * `BonusWinner(address winner, uint256 amount)`.
  * `PoolCompleted()`.

---

### **2.3 Dummy (YieldManager)**

* **Role**: Yield farming abstraction. Simulate yield growth without touching real protocols.
* **Responsibilities**:

  * `deposit()` → Stake pooled funds.
  * `withdraw()` → Redeem funds + yield.
  * Allow different strategies (Aave, Lido, etc).
* **Events**:

  * `FundsStaked(address pool, uint256 amount)`.
  * `FundsWithdrawn(address pool, uint256 amount)`.

---

### **2.4 LotteryManager (RNG)**

* **Role**: Fair randomness for weekly draws.
* **Responsibilities**:

  * Integrates with Chainlink VRF.
  * Provides `getRandomWinner(poolId)` per week.
* **Events**:

  * `RandomNumberRequested(poolId, requestId)`.
  * `BonusWinnerSelected(poolId, address winner)`.

---

### **2.5 RewardNFT**

* **Role**: Badges & collectibles for gamification.
* **Responsibilities**:

  * Mint NFT for milestones (joining, winning, completing).
  * Store metadata for rarity/levels.
* **Events**:

  * `BadgeMinted(address user, uint256 tokenId, string badgeType)`.

---

### **2.6 Treasury (Optional)**

* **Role**: Central reward & fee account.
* **Responsibilities**:

  * Collect protocol fee (% of yield).
  * Provide sponsored rewards for extra bonuses.
  * Governance controlled (DAO or admin).

---

## **3. Lifecycle Flow**

1. **Pool Creation** → User calls `createPool()`.

   * Params: contribution amount, member cap, duration.
   * Deploys a new Pool.

2. **Join Phase** → Members call `joinPool()` with funds.

   * Funds forwarded to YieldManager.

3. **Lock Phase** → Pool marked locked once full.

   * Weekly countdown starts.

4. **Weekly Draw** → Pool requests RNG → LotteryManager.

   * Winner receives bonus (yield or Treasury).

5. **Yield Growth** → YieldManager compounds until maturity.

6. **Completion** → Pool calls `withdraw()` on YieldManager.

   * Principal + yield distributed.
   * NFTs minted for milestones.

---

## **4. States & Transitions**

* `Open` → Members can join.
* `Locked` → Contributions closed, staking begins.
* `Active` → Weekly draws ongoing.
* `Completed` → Pool finished, payouts done.

---

## **5. Security Safeguards**

* **Reentrancy guards** on payouts.
* **State checks** (prevent late joins/withdrawals).
* **Access control** (OnlyPool modifier in YieldManager).
* **Fallback safety** (manual withdrawal if DeFi fails).
* **Upgradeable architecture** (proxy or modular).

---

## **6. Transparency & Events**

* Every key action emits events.
* Frontend can use TheGraph or wagmi hooks to listen.
* Events → `join`, `stake`, `winner`, `payout`.

---

## **7. Gas & UX**

* Batch actions (join + deposit in single tx).
* Avoid loops → use mappings for members.
* Use ERC-4626 Vault standard for yield integration.

---

## **8. Example Distribution Logic**

* 10 members deposit 1 ETH → 10 ETH total.
* YieldManager stakes in Lido → after 3 months = 10.5 ETH.
* Weekly bonus = 0.1 ETH × 12 weeks = 1.2 ETH (from yield).
* At completion:

  * Each gets back 1 ETH.
  * Remaining yield (0.5 ETH) shared equally = 0.05 ETH each.
  * Bonus winners already received extra.


## **7. User Flows**

1. User connects wallet → sees Dashboard.
2. User **creates or joins a pool**.
3. Smart contract locks funds + stakes in yield protocol.
4. Each week → **bonus draw** → random winner gets small reward.
5. All along → yield grows for everyone.
6. Pool ends → principal + yield returned, user keeps badges + bonus.

---

## **8. Technical Requirements**

* **Smart Contract**: solidity program for pool management, fund staking, RNG draws.
* **DeFi Integration**: Marinade (SOL staking).
* **Frontend**: React + Tailwind + solidity Wallet Adapter.
* **Backend (optional)**: Off-chain indexer for pool data (for faster UI).
* **RNG**: Chainlink VRF or solidity native randomness.
* **NFTs/Badges**: Minted as SPL NFTs.

---

## **9. Success Metrics**

* 🎯 **Adoption**: Number of pools created, number of users.
* 💰 **Financials**: Total Value Locked (TVL), yield distributed.
* 🎲 **Engagement**: Weekly draw participation, badge collection rate.
* 🌍 **Social**: Pool invites, community spread in target markets.

---

## **10. Risks & Mitigation**

* **Smart contract bug** → → external audit.
* **User drop-off** → gamification (badges, leaderboards, rewards).
* **Low liquidity / small pools** → sponsor campaigns or bootstrapped pools.

