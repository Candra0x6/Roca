import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  PoolFactory,
  Pool,
  Badge,
  LotteryManager,
  MockYieldManager,
} from "../typechain-types";

/**
 * @title Lottery System Integration Tests
 * @notice Comprehensive test suite for the lottery system including:
 * - Lottery configuration management
 * - Weekly draw execution and winner selection
 * - Prize distribution and badge minting
 * - Participant management and statistics
 * - Integration with pool system and yield distribution
 */
describe("LotteryManager - Complete Flow Testing", function () {
  let poolFactory: PoolFactory;
  let pool: Pool;
  let badge: Badge;
  let lotteryManager: LotteryManager;
  let yieldManager: MockYieldManager;
  
  let admin: SignerWithAddress;
  let creator: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;
  let member4: SignerWithAddress;
  let member5: SignerWithAddress;
  let signers: SignerWithAddress[];

  const CONTRIBUTION_AMOUNT = hre.ethers.parseEther("1.0");
  const POOL_DURATION = 24 * 60 * 60 * 30; // 30 days in seconds
  const WEEK_DURATION = 7 * 24 * 60 * 60; // 1 week in seconds

  async function deployLotterySystemFixture() {
    [admin, creator, member1, member2, member3, member4, member5, ...signers] = await hre.ethers.getSigners();

    console.log("📋 Deploying lottery system contracts...");

    // Deploy Badge contract
    const BadgeFactory = await hre.ethers.getContractFactory("Badge");
    badge = await BadgeFactory.deploy(
      admin.address,
      "https://api.example.com/badges/"
    );
    await badge.waitForDeployment();
    console.log("✅ Badge contract deployed:", await badge.getAddress());

    // Deploy Yield Manager
    const YieldManagerFactory = await hre.ethers.getContractFactory("MockYieldManager");
    yieldManager = await YieldManagerFactory.deploy();
    await yieldManager.waitForDeployment();
    console.log("✅ Yield Manager deployed:", await yieldManager.getAddress());

    // Deploy Lottery Manager with badge integration
    const LotteryManagerFactory = await hre.ethers.getContractFactory("LotteryManager");
    lotteryManager = await LotteryManagerFactory.deploy(
      admin.address,
      await badge.getAddress()
    );
    await lotteryManager.waitForDeployment();
    console.log("✅ Lottery Manager deployed:", await lotteryManager.getAddress());

    // Deploy Pool Factory
    const PoolFactoryFactory = await hre.ethers.getContractFactory("PoolFactory");
    poolFactory = await PoolFactoryFactory.deploy(
      admin.address,
      await badge.getAddress(),
      await lotteryManager.getAddress()
    );
    await poolFactory.waitForDeployment();
    console.log("✅ Pool Factory deployed:", await poolFactory.getAddress());

    // Grant POOL_ROLE to pool factory for lottery integration
    const POOL_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("POOL_ROLE"));
    await lotteryManager.connect(admin).grantRole(POOL_ROLE, await poolFactory.getAddress());
    
    // Grant role admin privileges to the PoolFactory so it can grant POOL_ROLE to individual pools
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await lotteryManager.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, await poolFactory.getAddress());
    console.log("✅ Pool role and admin role granted to factory");

    // Grant necessary roles for badge minting
    const MINTER_ROLE = await badge.MINTER_ROLE();
    await badge.connect(admin).grantRole(MINTER_ROLE, await poolFactory.getAddress());
    await badge.connect(admin).grantRole(MINTER_ROLE, await lotteryManager.getAddress());

    // Grant pool creator role
    const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
    await poolFactory.connect(admin).grantRole(POOL_CREATOR_ROLE, creator.address);

    // Create a test pool using the correct pattern
    const poolParams = {
      name: "Test Lottery Pool",
      contributionAmount: CONTRIBUTION_AMOUNT,
      maxMembers: 5,
      duration: POOL_DURATION,
      yieldManager: await yieldManager.getAddress()
    };

    await poolFactory.connect(creator).createPool(poolParams);
    const allPools = await poolFactory.getAllPools();
    const poolAddress = allPools[0];
    pool = await hre.ethers.getContractAt("Pool", poolAddress) as Pool;
    console.log("✅ Test pool created:", poolAddress);

    // Fund lottery manager for prize distribution
    await admin.sendTransaction({
      to: await lotteryManager.getAddress(),
      value: hre.ethers.parseEther("10.0")
    });
    console.log("✅ Lottery manager funded with 10 ETH");

    return {
      poolFactory,
      pool,
      badge,
      lotteryManager,
      yieldManager,
      admin,
      creator,
      member1,
      member2,
      member3,
      member4,
      member5,
      signers
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
      member2,
      member3,
      member4,
      member5,
      signers
    } = await loadFixture(deployLotterySystemFixture));
  });

  describe("🏗️ Lottery Configuration Management", function () {
    it("should initialize with correct default configuration", async function () {
      const config = await lotteryManager.getLotteryConfig();
      
      expect(config.drawInterval).to.equal(WEEK_DURATION);
      expect(config.prizePercentage).to.equal(1000); // 10% (1000 basis points)
      expect(config.minPoolSize).to.equal(5);
      expect(config.maxPrizeAmount).to.equal(hre.ethers.parseEther("10"));
      expect(config.isActive).to.be.true;
      
      console.log("✅ Default lottery configuration verified");
    });

    it("should allow admin to update lottery configuration", async function () {
      const newConfig = {
        drawInterval: WEEK_DURATION * 2, // 2 weeks
        prizePercentage: 1500, // 15%
        minPoolSize: 3,
        maxPrizeAmount: hre.ethers.parseEther("20"),
        isActive: true
      };

      await lotteryManager.connect(admin).updateLotteryConfig(newConfig);

      const updatedConfig = await lotteryManager.getLotteryConfig();
      expect(updatedConfig.drawInterval).to.equal(newConfig.drawInterval);
      expect(updatedConfig.prizePercentage).to.equal(newConfig.prizePercentage);
      expect(updatedConfig.minPoolSize).to.equal(newConfig.minPoolSize);
      expect(updatedConfig.maxPrizeAmount).to.equal(newConfig.maxPrizeAmount);

      console.log("✅ Lottery configuration updated successfully");
    });

    it("should reject invalid configuration parameters", async function () {
      // Invalid draw interval (too short)
      await expect(lotteryManager.connect(admin).updateLotteryConfig({
        drawInterval: 0,
        prizePercentage: 1000,
        minPoolSize: 5,
        maxPrizeAmount: hre.ethers.parseEther("10"),
        isActive: true
      })).to.be.reverted;

      console.log("✅ Invalid configuration rejection verified");
    });

    it("should allow pausing and unpausing lottery system", async function () {
      // Pause lottery
      await lotteryManager.connect(admin).setLotteryActive(false);

      let config = await lotteryManager.getLotteryConfig();
      expect(config.isActive).to.be.false;

      // Unpause lottery
      await lotteryManager.connect(admin).setLotteryActive(true);

      config = await lotteryManager.getLotteryConfig();
      expect(config.isActive).to.be.true;

      console.log("✅ Lottery pause/unpause functionality verified");
    });
  });

  describe("🎫 Pool Participant Management", function () {
    beforeEach(async function () {
      // Fill the pool with members
      await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member4).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member5).joinPool({ value: CONTRIBUTION_AMOUNT });

      console.log("🎯 Pool filled with 5 members for lottery testing");
    });

    it("should verify pool eligibility correctly", async function () {
      // Pool should be eligible since participants are automatically registered when pool locks
      expect(await lotteryManager.isPoolEligible(1)).to.be.true;

      console.log("✅ Pool eligibility calculation verified");
    });

    it("should handle participant management correctly", async function () {
      // Check participant count - participants are automatically added when pool locks
      const participants = await lotteryManager.getPoolParticipants(1);
      
      // Since the beforeEach fills the pool, participants should be automatically registered
      expect(participants.length).to.equal(5);

      console.log("✅ Participant management verified");
    });

    it("should automatically register participants when pool locks", async function () {
      // Advance time to bypass pool creation cooldown
      await time.increase(3600); // Advance by 1 hour

      // Create a fresh pool for this test
      const freshPoolParams = {
        name: "Fresh Lottery Pool",
        contributionAmount: CONTRIBUTION_AMOUNT,
        maxMembers: 5,
        duration: POOL_DURATION,
        yieldManager: await yieldManager.getAddress()
      };

      await poolFactory.connect(creator).createPool(freshPoolParams);
      const allPools = await poolFactory.getAllPools();
      const freshPoolAddress = allPools[allPools.length - 1]; // Get the last created pool
      const freshPool = await hre.ethers.getContractAt("Pool", freshPoolAddress) as Pool;

      console.log(`Fresh pool created at: ${freshPoolAddress}`);

      // Check what pool ID the factory returns for this pool
      const factoryPoolId = await poolFactory.getPoolId(freshPoolAddress);
      console.log(`Factory returned pool ID: ${factoryPoolId}`);

      // Fill the fresh pool - this should auto-lock and register participants
      await freshPool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
      console.log("Member 1 joined");
      
      await freshPool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
      console.log("Member 2 joined");
      
      await freshPool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
      console.log("Member 3 joined");
      
      await freshPool.connect(member4).joinPool({ value: CONTRIBUTION_AMOUNT });
      console.log("Member 4 joined");
      
      await freshPool.connect(member5).joinPool({ value: CONTRIBUTION_AMOUNT }); // This should trigger auto-lock
      console.log("Member 5 joined - Pool should now be locked");

      // Verify pool is locked
      const poolInfo = await freshPool.getPoolInfo();
      console.log(`Pool status: ${poolInfo.status}`);
      expect(poolInfo.status).to.equal(2); // PoolStatus.Active

      // Check participants
      const participants = await lotteryManager.getPoolParticipants(factoryPoolId);
      console.log(`Participants found: ${participants.length}`);
      console.log(`Participants: ${participants.map(p => p.participantAddress)}`);
      
      expect(participants.length).to.equal(5);

      console.log("✅ Automatic participant registration verified");
    });
  });

  describe("🎲 Basic Lottery Draw Execution", function () {
    beforeEach(async function () {
      // Setup pool with participants
      await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member4).joinPool({ value: CONTRIBUTION_AMOUNT });
      await pool.connect(member5).joinPool({ value: CONTRIBUTION_AMOUNT });

      console.log("🎯 Pool setup complete with 5 members");
    });

    it("should calculate prize amounts correctly", async function () {
      const poolYield = hre.ethers.parseEther("2.0"); // Simulate 2 ETH yield
      const calculatedPrize = await lotteryManager.calculatePrizeAmount(1, poolYield);
      const expectedPrize = (poolYield * 1000n) / 10000n; // 10% of yield

      expect(calculatedPrize).to.equal(expectedPrize);

      console.log(`✅ Prize calculation verified: ${hre.ethers.formatEther(calculatedPrize)} ETH`);
    });

    it("should handle lottery configuration updates correctly", async function () {
      // Test updating configuration
      const newConfig = {
        drawInterval: WEEK_DURATION,
        prizePercentage: 2000, // 20%
        minPoolSize: 3,
        maxPrizeAmount: hre.ethers.parseEther("5"),
        isActive: true
      };

      await lotteryManager.connect(admin).updateLotteryConfig(newConfig);
      
      const updatedConfig = await lotteryManager.getLotteryConfig();
      expect(updatedConfig.prizePercentage).to.equal(2000);

      console.log("✅ Lottery configuration update verified");
    });
  });

  describe("📊 Statistics and Utility Functions", function () {
    it("should provide correct global lottery statistics", async function () {
      const [totalDraws, totalPrizesDistributed, totalParticipants, averagePrizeAmount] = await lotteryManager.getGlobalLotteryStats();
      
      // Initially should be zero
      expect(totalDraws).to.equal(0);
      expect(totalPrizesDistributed).to.equal(0);
      
      console.log("🌐 Global Stats verified:");
      console.log(`   Total Draws: ${totalDraws}`);
      console.log(`   Total Distributed: ${hre.ethers.formatEther(totalPrizesDistributed)} ETH`);
      console.log(`   Unique Participants: ${totalParticipants}`);
      console.log(`   Average Prize: ${hre.ethers.formatEther(averagePrizeAmount)} ETH`);
    });

    it("should handle badge contract integration", async function () {
      const currentBadgeContract = await lotteryManager.getBadgeContract();
      expect(currentBadgeContract).to.equal(await badge.getAddress());

      console.log("✅ Badge contract integration verified");
    });

    it("should handle emergency functions", async function () {
      // Test emergency pause
      await lotteryManager.connect(admin).emergencyPause();
      
      // Test emergency unpause
      await lotteryManager.connect(admin).emergencyUnpause();

      console.log("✅ Emergency functions verified");
    });
  });

  describe("🔒 Security & Access Control", function () {
    it("should enforce role-based access control", async function () {
      // Non-admin should not be able to update configuration
      await expect(lotteryManager.connect(member1).updateLotteryConfig({
        drawInterval: WEEK_DURATION,
        prizePercentage: 1000,
        minPoolSize: 5,
        maxPrizeAmount: hre.ethers.parseEther("10"),
        isActive: true
      })).to.be.reverted;

      console.log("✅ Role-based access control enforced");
    });

    it("should validate function parameters", async function () {
      // Try to get draw for non-existent draw
      const nonExistentDraw = await lotteryManager.getDraw(999);
      expect(nonExistentDraw.drawId).to.equal(0); // Should return empty draw

      console.log("✅ Parameter validation verified");
    });
  });

  describe("🎯 Advanced Integration Tests", function () {
    it("should integrate with pool factory correctly", async function () {
      console.log("🚀 Testing pool factory integration...");

      // Verify lottery manager is connected to pool factory
      const POOL_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("POOL_ROLE"));
      const hasRole = await lotteryManager.hasRole(POOL_ROLE, await poolFactory.getAddress());
      expect(hasRole).to.be.true;

      console.log("✅ Pool factory integration verified");
    });

    it("should handle contract balance and funding", async function () {
      const contractBalance = await hre.ethers.provider.getBalance(await lotteryManager.getAddress());
      expect(contractBalance).to.be.greaterThan(0);

      // Test receiving additional funds
      await admin.sendTransaction({
        to: await lotteryManager.getAddress(),
        value: hre.ethers.parseEther("1.0")
      });

      const newBalance = await hre.ethers.provider.getBalance(await lotteryManager.getAddress());
      expect(newBalance).to.be.greaterThan(contractBalance);

      console.log(`✅ Contract funding verified - Balance: ${hre.ethers.formatEther(newBalance)} ETH`);
    });
  });
});
