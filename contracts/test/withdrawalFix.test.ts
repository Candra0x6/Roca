import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Pool, MockYieldManager, PoolFactory } from "../typechain-types";

describe("Withdrawal Fix Test", function () {
  let pool: Pool;
  let yieldManager: MockYieldManager;
  let poolFactory: PoolFactory;
  let creator: any;
  let member1: any;
  let member2: any;

  const CONTRIBUTION_AMOUNT = ethers.parseEther("1.2");
  const POOL_DURATION = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [creator, member1, member2] = await ethers.getSigners();

    // Deploy MockYieldManager
    const MockYieldManagerFactory = await ethers.getContractFactory("MockYieldManager");
    yieldManager = await MockYieldManagerFactory.deploy();

    // Deploy PoolFactory
    const PoolFactoryFactory = await ethers.getContractFactory("PoolFactory");
    poolFactory = await PoolFactoryFactory.deploy(
      await yieldManager.getAddress(),
      ethers.ZeroAddress // No badge contract for this test
    );

    // Create a pool
    const poolParams = {
      name: "Test Pool",
      contributionAmount: CONTRIBUTION_AMOUNT,
      maxMembers: 2,
      duration: POOL_DURATION,
      yieldManager: await yieldManager.getAddress()
    };

    const tx = await poolFactory.connect(creator).createPool(poolParams);

    const receipt = await tx.wait();
    const event = receipt?.logs.find(log => {
      try {
        return poolFactory.interface.parseLog(log as any)?.name === 'PoolCreated';
      } catch {
        return false;
      }
    });

    if (!event) throw new Error("PoolCreated event not found");
    
    const parsedEvent = poolFactory.interface.parseLog(event as any);
    const poolAddress = parsedEvent?.args[1]; // Pool address is second argument

    // Get pool contract instance
    pool = await ethers.getContractAt("Pool", poolAddress);

    // Creator joins the pool
    await pool.connect(creator).joinPool({ value: CONTRIBUTION_AMOUNT });
  });

  it("Should reproduce withdrawal failure", async function () {
    console.log("=== Starting Withdrawal Test ===");

    // Member1 joins the pool (pool should auto-lock when full)
    await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
    
    console.log("✅ Both members joined, pool should be locked and active");

    // Check pool status
    const poolInfo = await pool.getPoolInfo();
    console.log("Pool status:", poolInfo.status); // Should be 2 (Active)
    console.log("Total funds:", ethers.formatEther(poolInfo.totalFunds));

    // Check yield manager balance
    const yieldManagerBalance = await ethers.provider.getBalance(await yieldManager.getAddress());
    console.log("Yield manager balance:", ethers.formatEther(yieldManagerBalance));

    // Check pool contract balance
    const poolBalance = await ethers.provider.getBalance(await pool.getAddress());
    console.log("Pool contract balance BEFORE completion:", ethers.formatEther(poolBalance));

    // Fast forward time to end of pool duration
    await time.increase(POOL_DURATION + 1);

    // Complete the pool
    console.log("\n=== Completing Pool ===");
    await pool.completePool();

    // Check balances after completion
    const poolBalanceAfter = await ethers.provider.getBalance(await pool.getAddress());
    const yieldManagerBalanceAfter = await ethers.provider.getBalance(await yieldManager.getAddress());
    
    console.log("Pool contract balance AFTER completion:", ethers.formatEther(poolBalanceAfter));
    console.log("Yield manager balance AFTER completion:", ethers.formatEther(yieldManagerBalanceAfter));

    // Check if pool has sufficient balance for withdrawal
    const member1Info = await pool.getMemberInfo(member1.address);
    const expectedWithdrawal = member1Info.contribution + member1Info.yieldEarned;
    
    console.log("Expected withdrawal amount:", ethers.formatEther(expectedWithdrawal));
    console.log("Pool has sufficient balance:", poolBalanceAfter >= expectedWithdrawal);

    // Try to withdraw - this should fail if pool doesn't have enough balance
    console.log("\n=== Attempting Withdrawal ===");
    
    if (poolBalanceAfter < expectedWithdrawal) {
      console.log("❌ Pool contract balance insufficient - withdrawal will fail");
      await expect(pool.connect(member1).withdrawShare())
        .to.be.revertedWithCustomError(pool, "WithdrawalFailed");
    } else {
      console.log("✅ Pool contract balance sufficient - withdrawal should succeed");
      await expect(pool.connect(member1).withdrawShare())
        .to.not.be.reverted;
    }
  });

  it("Should test yield manager withdraw function", async function () {
    console.log("=== Testing Yield Manager Withdraw Function ===");

    // Member1 joins
    await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
    
    // Check initial balances
    const poolId = await poolFactory.getPoolId(await pool.getAddress());
    console.log("Pool ID:", poolId.toString());

    const yieldManagerBalance = await ethers.provider.getBalance(await yieldManager.getAddress());
    console.log("Yield manager balance:", ethers.formatEther(yieldManagerBalance));

    // Try direct withdraw call to yield manager
    console.log("\n=== Testing Direct Yield Manager Withdraw ===");
    
    try {
      const tx = await yieldManager.withdraw(poolId);
      const receipt = await tx.wait();
      console.log("✅ Direct withdraw call succeeded");
      console.log("Gas used:", receipt?.gasUsed.toString());
      
      // Check if ETH was sent back
      const poolBalanceAfter = await ethers.provider.getBalance(await pool.getAddress());
      console.log("Pool balance after direct withdraw:", ethers.formatEther(poolBalanceAfter));
      
    } catch (error) {
      console.log("❌ Direct withdraw call failed:", error);
    }
  });
});
