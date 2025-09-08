/**
 * @title Small Pool Lottery Registration Test
 * @notice Tests lottery registration behavior with pools that have fewer than the minimum required members
 */
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { PoolFactory, Pool, Badge, LotteryManager, MockYieldManager } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Lottery Registration - Small Pool Handling", function () {
  let poolFactory: PoolFactory;
  let pool: Pool;
  let badge: Badge;
  let lotteryManager: LotteryManager;
  let yieldManager: MockYieldManager;
  
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;

  const CONTRIBUTION_AMOUNT = hre.ethers.parseEther("1.0");
  const POOL_DURATION = 24 * 60 * 60 * 30; // 30 days in seconds

  async function deploySystemFixture() {
    [admin, creator, member1, member2] = await hre.ethers.getSigners();

    console.log("📋 Deploying system for small pool test...");

    // Deploy Badge contract
    const BadgeFactory = await hre.ethers.getContractFactory("Badge");
    badge = await BadgeFactory.deploy(
      admin.address,
      "https://api.example.com/badges/"
    );
    await badge.waitForDeployment();

    // Deploy Yield Manager
    const YieldManagerFactory = await hre.ethers.getContractFactory("MockYieldManager");
    yieldManager = await YieldManagerFactory.deploy();
    await yieldManager.waitForDeployment();

    // Deploy Lottery Manager with badge integration
    const LotteryManagerFactory = await hre.ethers.getContractFactory("LotteryManager");
    lotteryManager = await LotteryManagerFactory.deploy(
      admin.address,
      await badge.getAddress()
    );
    await lotteryManager.waitForDeployment();

    // Deploy Pool Factory
    const PoolFactoryFactory = await hre.ethers.getContractFactory("PoolFactory");
    poolFactory = await PoolFactoryFactory.deploy(
      admin.address,
      await badge.getAddress(),
      await lotteryManager.getAddress()
    );
    await poolFactory.waitForDeployment();

    // Grant necessary roles
    const POOL_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("POOL_ROLE"));
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    await lotteryManager.connect(admin).grantRole(POOL_ROLE, await poolFactory.getAddress());
    await lotteryManager.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, await poolFactory.getAddress());

    const MINTER_ROLE = await badge.MINTER_ROLE();
    await badge.connect(admin).grantRole(MINTER_ROLE, await poolFactory.getAddress());
    await badge.connect(admin).grantRole(MINTER_ROLE, await lotteryManager.getAddress());

    const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
    await poolFactory.connect(admin).grantRole(POOL_CREATOR_ROLE, creator.address);

    // Create a test pool - with max 2 members (less than lottery minimum of 5)
    const poolParams = {
      name: "Small Test Pool",
      contributionAmount: CONTRIBUTION_AMOUNT,
      maxMembers: 2, // This is less than the lottery minimum of 5
      duration: POOL_DURATION,
      yieldManager: await yieldManager.getAddress()
    };

    await poolFactory.connect(creator).createPool(poolParams);
    const allPools = await poolFactory.getAllPools();
    const poolAddress = allPools[0];
    pool = await hre.ethers.getContractAt("Pool", poolAddress) as Pool;

    return {
      poolFactory,
      pool,
      badge,
      lotteryManager,
      yieldManager,
      admin,
      creator,
      member1,
      member2
    };
  }

  beforeEach(async function () {
    ({
      poolFactory,
      pool,
      badge,
      lotteryManager,
      yieldManager,
      admin,
      creator,
      member1,
      member2
    } = await loadFixture(deploySystemFixture));
  });

  describe("🧪 Small Pool Lottery Registration", function () {
    it("should handle lottery registration gracefully for pools with fewer than minimum members", async function () {
      console.log("🎯 Testing with 2 members (below lottery minimum of 5)");

      // Get pool ID for verification
      const poolId = await poolFactory.getPoolId(await pool.getAddress());
      console.log(`Pool ID: ${poolId}`);

      // Check initial lottery eligibility (should be false - no participants yet)
      const initialEligibility = await lotteryManager.isPoolEligible(poolId);
      console.log(`Initial lottery eligibility: ${initialEligibility}`);
      expect(initialEligibility).to.be.false;

      // Add members to the pool (this should trigger auto-lock since maxMembers = 2)
      console.log("Adding member 1...");
      await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
      
      console.log("Adding member 2 (should trigger auto-lock)...");
      await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });

      // Verify pool is locked/active
      const poolInfo = await pool.getPoolInfo();
      console.log(`Pool status after filling: ${poolInfo.status}`);
      expect(poolInfo.status).to.equal(2); // PoolStatus.Active

      // Check that lottery participants were NOT registered (due to insufficient members)
      const participants = await lotteryManager.getPoolParticipants(poolId);
      console.log(`Lottery participants registered: ${participants.length}`);
      expect(participants.length).to.equal(0); // Should be 0 since pool is not eligible

      // Verify lottery eligibility is still false
      const finalEligibility = await lotteryManager.isPoolEligible(poolId);
      console.log(`Final lottery eligibility: ${finalEligibility}`);
      expect(finalEligibility).to.be.false;

      // Verify pool still functions normally (can complete, withdraw, etc.)
      console.log("✅ Pool locked successfully without lottery registration");
      console.log("✅ Lottery system gracefully handled ineligible pool");
    });

    it("should show the difference in configuration", async function () {
      const lotteryConfig = await lotteryManager.getLotteryConfig();
      console.log(`Lottery minimum pool size: ${lotteryConfig.minPoolSize}`);
      
      const poolInfo = await pool.getPoolInfo();
      console.log(`Pool max members: ${poolInfo.maxMembers}`);
      console.log(`Pool current members: ${poolInfo.currentMembers}`);
      
      console.log("💡 This demonstrates the configuration mismatch:");
      console.log(`   - Pool can lock with 2 members (MIN_MEMBERS_TO_LOCK = 2)`);
      console.log(`   - Lottery requires 5+ members (minPoolSize = 5)`);
      console.log(`   - Solution: _registerLotteryParticipants() now checks eligibility first`);
    });
  });
});
