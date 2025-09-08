import hre from "hardhat";

async function main() {
  console.log("🔍 Debugging lottery participant registration for pools with >2 members");
  console.log("=".repeat(70));

  const [deployer, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();
  
  // Get contract addresses from recent deployment
  const contracts = {
    poolFactory: "0x40a42Baf86Fc821f972Ad2aC878729063CeEF403",
    lotteryManager: "0x4bf010f1b9beDA5450a8dD702ED602A104ff65EE",
    rewardNFT: "0x0ed64d01D0B4B655E410EF1441dD677B695639E7",
    mockYieldManager: "0x5302E909d1e93e30F05B5D6Eea766363D14F9892"
  };

  // Get contract instances
  const poolFactory = await ethers.getContractAt("PoolFactory", contracts.poolFactory);
  const lotteryManager = await ethers.getContractAt("LotteryManager", contracts.lotteryManager);
  
  console.log("📋 Contract instances loaded");
  
  try {
    // Check lottery configuration
    const config = await lotteryManager.getConfig();
    console.log("🎲 Lottery Config:");
    console.log("  - Active:", config.isActive);
    console.log("  - Min Pool Size:", config.minPoolSize.toString());
    console.log("  - Prize %:", config.prizePercentage.toString());
    
    // Create a pool with 5 members
    console.log("\n🏊 Creating pool with 5 members...");
    
    const contributionAmount = ethers.parseEther("0.1");
    const poolName = "Test Pool 5 Members";
    const duration = 30 * 24 * 60 * 60; // 30 days
    const maxMembers = 5;
    const yieldTarget = ethers.parseEther("0.05");
    
    const tx = await poolFactory.connect(deployer).createPool(
      poolName,
      duration,
      contributionAmount,
      maxMembers,
      yieldTarget,
      contracts.mockYieldManager,
      { value: contributionAmount }
    );
    
    const receipt = await tx.wait();
    const poolCreatedEvent = receipt.logs.find(
      log => log.fragment && log.fragment.name === 'PoolCreated'
    );
    
    if (!poolCreatedEvent) {
      throw new Error("PoolCreated event not found");
    }
    
    const poolAddress = poolCreatedEvent.args[0];
    const poolId = poolCreatedEvent.args[1];
    
    console.log("✅ Pool created:");
    console.log("  - Address:", poolAddress);
    console.log("  - Pool ID:", poolId.toString());
    
    // Get pool contract instance
    const pool = await ethers.getContractAt("Pool", poolAddress);
    
    // Check initial state
    let poolInfo = await pool.getPoolInfo();
    console.log("📊 Initial pool state:");
    console.log("  - Current members:", poolInfo.currentMembers.toString());
    console.log("  - Status:", poolInfo.status);
    
    // Add more members
    console.log("\n👥 Adding 4 more members...");
    
    const users = [user1, user2, user3, user4];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`  Adding member ${i + 2}: ${user.address}`);
      
      const joinTx = await pool.connect(user).joinPool({ value: contributionAmount });
      await joinTx.wait();
      
      // Check updated state
      poolInfo = await pool.getPoolInfo();
      console.log(`    Current members: ${poolInfo.currentMembers.toString()}`);
    }
    
    // Pool should be automatically locked when reaching maxMembers
    poolInfo = await pool.getPoolInfo();
    console.log("\n🔒 Final pool state:");
    console.log("  - Current members:", poolInfo.currentMembers.toString());
    console.log("  - Status:", poolInfo.status);
    console.log("  - Is locked:", poolInfo.status === 2); // PoolStatus.Active
    
    // Check lottery participants
    console.log("\n🎲 Checking lottery participants...");
    
    try {
      const participants = await lotteryManager.getPoolParticipants(poolId);
      console.log("  - Participants registered:", participants.length);
      console.log("  - Participants:", participants);
      
      // Check pool eligibility
      const poolStatus = await lotteryManager.getPoolLotteryStatus(poolId);
      console.log("  - Pool is eligible:", poolStatus.isEligible);
      console.log("  - Last draw:", poolStatus.lastDrawTimestamp.toString());
      
    } catch (error) {
      console.log("  ❌ Error getting participants:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
