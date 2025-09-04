const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing frontend integration with deployed contracts...");
  console.log("=".repeat(60));

  // Use the same addresses as the frontend config
  const POOL_FACTORY_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const YIELD_MANAGER_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
//   Yield Manager Address 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
// Pool Address 0x75537828f2ce51be7289709686A69CbFDbB714F1
  const [deployer, user1, user2] = await ethers.getSigners();
  
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log();

  // Get contract instances using the deployed addresses
  const poolFactory = await ethers.getContractAt("PoolFactory", POOL_FACTORY_ADDRESS);
  const yieldManager = await ethers.getContractAt("MockYieldManager", YIELD_MANAGER_ADDRESS);

  console.log("📦 Contract instances created successfully");
  console.log("PoolFactory:", await poolFactory.getAddress());
  console.log("YieldManager:", await yieldManager.getAddress());
  console.log();

  // Create a pool configuration
  const poolParams = {
    name: "Frontend Test Pool",
    contributionAmount: ethers.parseEther("2"), // 2 ETH per member
    maxMembers: 2,
    duration: 30 * 24 * 60 * 60, // 30 days
    yieldManager: YIELD_MANAGER_ADDRESS
  };

  // Check if pools already exist and use existing one or create new
  try {
    const poolCount = await poolFactory.getPoolCount();
    console.log("📊 Current pool count:", poolCount.toString());
    
    let pools = await poolFactory.getAllPools();
    console.log("📊 Current pools:", pools.length);
    
    let poolAddress;
    
    if (pools.length > 0) {
      // Use existing pool
      poolAddress = pools[pools.length - 1];
      console.log("🔄 Using existing pool:", poolAddress);
      console.log();
    } else {
      // Create new pool
      console.log("🏗️  Creating new pool with params:");
      console.log("- Name:", poolParams.name);
      console.log("- Contribution:", ethers.formatEther(poolParams.contributionAmount), "ETH");
      console.log("- Max Members:", poolParams.maxMembers);
      console.log("- Duration:", poolParams.duration / (24 * 60 * 60), "days");
      console.log();

      const createTx = await poolFactory.connect(user1).createPool(poolParams);
      await createTx.wait();
      console.log("✅ Pool created successfully");

      // Get the new pool address
      pools = await poolFactory.getAllPools();
      poolAddress = pools[pools.length - 1];
      console.log("📍 New pool address:", poolAddress);
    }
    
    console.log("📊 Total pools now:", pools.length);
    console.log();

    // Get pool contract instance
    const pool = await ethers.getContractAt("Pool", poolAddress);

    // Check initial state
    const poolInfo = await pool.getPoolInfo();
    console.log("📊 Initial pool state:");
    console.log("- Status:", poolInfo.status); // Should be 0 (Open)
    console.log("- Current Members:", poolInfo.currentMembers.toString());
    console.log("- Total Funds:", ethers.formatEther(poolInfo.totalFunds), "ETH");
    console.log();

    // Check initial balances
    const initialPoolBalance = await ethers.provider.getBalance(poolAddress);
    const initialYieldManagerBalance = await ethers.provider.getBalance(YIELD_MANAGER_ADDRESS);
    
    console.log("💰 Initial balances:");
    console.log("- Pool:", ethers.formatEther(initialPoolBalance), "ETH");
    console.log("- YieldManager:", ethers.formatEther(initialYieldManagerBalance), "ETH");
    console.log();

    // First user joins (pool creator)
    console.log("👤 User1 joining pool...");
    const joinTx1 = await pool.connect(user1).joinPool({ 
      value: poolParams.contributionAmount 
    });
    await joinTx1.wait();
    console.log("✅ User1 joined successfully");

    // Check state after first join
    const poolInfoAfterFirst = await pool.getPoolInfo();
    const poolBalanceAfterFirst = await ethers.provider.getBalance(poolAddress);
    const yieldManagerBalanceAfterFirst = await ethers.provider.getBalance(YIELD_MANAGER_ADDRESS);
    
    console.log("📊 State after first join:");
    console.log("- Status:", poolInfoAfterFirst.status);
    console.log("- Current Members:", poolInfoAfterFirst.currentMembers.toString());
    console.log("- Total Funds:", ethers.formatEther(poolInfoAfterFirst.totalFunds), "ETH");
    console.log("- Pool Balance:", ethers.formatEther(poolBalanceAfterFirst), "ETH");
    console.log("- YieldManager Balance:", ethers.formatEther(yieldManagerBalanceAfterFirst), "ETH");
    console.log();

    // Second user joins (should trigger auto-lock)
    console.log("👤 User2 joining pool (should trigger auto-lock)...");
    const joinTx2 = await pool.connect(user2).joinPool({ 
      value: poolParams.contributionAmount 
    });
    await joinTx2.wait();
    console.log("✅ User2 joined successfully");

    // Check final state
    const finalPoolInfo = await pool.getPoolInfo();
    const finalPoolBalance = await ethers.provider.getBalance(poolAddress);
    const finalYieldManagerBalance = await ethers.provider.getBalance(YIELD_MANAGER_ADDRESS);
    
    console.log("📊 Final state:");
    console.log("- Status:", finalPoolInfo.status); // Should be 2 (Active)
    console.log("- Current Members:", finalPoolInfo.currentMembers.toString());
    console.log("- Total Funds:", ethers.formatEther(finalPoolInfo.totalFunds), "ETH");
    console.log("- Pool Balance:", ethers.formatEther(finalPoolBalance), "ETH");
    console.log("- YieldManager Balance:", ethers.formatEther(finalYieldManagerBalance), "ETH");
    console.log();

    // Verify success conditions
    const success = 
      finalPoolInfo.status === 2n && // Active
      finalPoolInfo.currentMembers === 2n && // Both members joined
      finalPoolBalance === 0n && // Pool balance empty (funds transferred)
      finalYieldManagerBalance === ethers.parseEther("4"); // YieldManager has 4 ETH

    if (success) {
      console.log("🎉 SUCCESS! Frontend integration test passed!");
      console.log("✅ Pool auto-locked correctly");
      console.log("✅ Funds transferred to YieldManager");
      console.log("✅ No double-locking issues");
    } else {
      console.log("❌ FAILED! Integration test failed");
      console.log("Expected:");
      console.log("- Pool status: 2 (Active), got:", finalPoolInfo.status.toString());
      console.log("- Pool balance: 0 ETH, got:", ethers.formatEther(finalPoolBalance), "ETH");
      console.log("- YieldManager balance: 4 ETH, got:", ethers.formatEther(finalYieldManagerBalance), "ETH");
    }

    console.log();
    console.log("🔧 Contract addresses for frontend:");
    console.log("- PoolFactory:", POOL_FACTORY_ADDRESS);
    console.log("- YieldManager:", YIELD_MANAGER_ADDRESS);
    console.log("- Pool:", poolAddress);
    
  } catch (error) {
    console.error("❌ Error during pool testing:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
