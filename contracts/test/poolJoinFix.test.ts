import { expect } from "chai";
import hre from "hardhat";
import { PoolFactory, Pool, YieldManager, Badge } from "../typechain-types";

describe("Pool Join Fix Test", function () {
  let poolFactory: PoolFactory;
  let yieldManager: YieldManager;
  let badge: Badge;
  let admin: any;
  let creator: any;
  let member1: any;
  let member2: any;

  const CONTRIBUTION_AMOUNT = hre.ethers.parseEther("2");
  const MAX_MEMBERS = 2;
  const POOL_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [admin, creator, member1, member2] = await hre.ethers.getSigners();

    // Deploy Badge contract
    const BadgeFactory = await hre.ethers.getContractFactory("Badge");
    badge = await BadgeFactory.deploy(
      admin.address,
      "https://api.example.com/badges/"
    );
    await badge.waitForDeployment();

    // Deploy YieldManager
    const YieldManagerFactory = await hre.ethers.getContractFactory("YieldManager");
    yieldManager = await YieldManagerFactory.deploy();
    await yieldManager.waitForDeployment();

    // Deploy PoolFactory
    const PoolFactoryFactory = await hre.ethers.getContractFactory("PoolFactory");
    poolFactory = await PoolFactoryFactory.deploy(
      admin.address,
      await badge.getAddress()
    );
    await poolFactory.waitForDeployment();

    // Grant necessary roles
    await badge.connect(admin).grantRole(
      await badge.MINTER_ROLE(),
      await poolFactory.getAddress()
    );
  });

  it("Should handle two members joining without double-locking", async function () {
    console.log("Testing pool creation and member joining...");

    // Create pool with 2 max members
    const poolParams = {
      name: "Test Pool",
      contributionAmount: CONTRIBUTION_AMOUNT,
      maxMembers: MAX_MEMBERS,
      duration: POOL_DURATION,
      yieldManager: await yieldManager.getAddress()
    };

    console.log("Creating pool...");
    await poolFactory.connect(creator).createPool(poolParams);
    
    const allPools = await poolFactory.getAllPools();
    const poolAddress = allPools[0];
    const pool = await hre.ethers.getContractAt("Pool", poolAddress) as Pool;

    console.log(`Pool created at: ${poolAddress}`);

    // Get initial balances
    const initialPoolBalance = await hre.ethers.provider.getBalance(poolAddress);
    const initialYieldManagerBalance = await hre.ethers.provider.getBalance(await yieldManager.getAddress());
    
    console.log(`Initial Pool balance: ${hre.ethers.formatEther(initialPoolBalance)} ETH`);
    console.log(`Initial YieldManager balance: ${hre.ethers.formatEther(initialYieldManagerBalance)} ETH`);

    // First member joins
    console.log("First member joining...");
    await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });

    const afterFirstJoinPoolBalance = await hre.ethers.provider.getBalance(poolAddress);
    const afterFirstJoinYieldManagerBalance = await hre.ethers.provider.getBalance(await yieldManager.getAddress());
    
    console.log(`After first join Pool balance: ${hre.ethers.formatEther(afterFirstJoinPoolBalance)} ETH`);
    console.log(`After first join YieldManager balance: ${hre.ethers.formatEther(afterFirstJoinYieldManagerBalance)} ETH`);

    // Check pool status
    const poolInfoAfterFirst = await pool.getPoolInfo();
    console.log(`Pool status after first join: ${poolInfoAfterFirst.status}`);
    console.log(`Current members: ${poolInfoAfterFirst.currentMembers}`);

    // Second member joins (should trigger auto-lock if not already locked)
    console.log("Second member joining...");
    await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });

    const finalPoolBalance = await hre.ethers.provider.getBalance(poolAddress);
    const finalYieldManagerBalance = await hre.ethers.provider.getBalance(await yieldManager.getAddress());
    
    console.log(`Final Pool balance: ${hre.ethers.formatEther(finalPoolBalance)} ETH`);
    console.log(`Final YieldManager balance: ${hre.ethers.formatEther(finalYieldManagerBalance)} ETH`);

    // Check final pool status
    const finalPoolInfo = await pool.getPoolInfo();
    console.log(`Final pool status: ${finalPoolInfo.status}`);
    console.log(`Final members: ${finalPoolInfo.currentMembers}`);
    console.log('Yield Manager Address', await yieldManager.getAddress());
    console.log('Pool Address', poolAddress);
    // Verify that funds were properly transferred to YieldManager
    expect(finalYieldManagerBalance).to.equal(CONTRIBUTION_AMOUNT * BigInt(2));
    expect(finalPoolBalance).to.equal(0);

    // Verify pool is in Active status (not just Locked)
    expect(finalPoolInfo.status).to.equal(2); // PoolStatus.Active
    expect(finalPoolInfo.currentMembers).to.equal(2);

    console.log("Test completed successfully!");
  });
});
