import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeployedContracts {
  mockYieldManager: Contract;
  yieldManager: Contract;
  rewardNFT: Contract;
  poolFactory: Contract;
  lotteryManager: Contract;
}

async function main() {
  console.log("🚀 Starting full deployment of Arisan+ contracts...");
  console.log("=".repeat(60));

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. Deployment might fail.");
  }

  const networkInfo = await ethers.provider.getNetwork();
  console.log("Network:", networkInfo.name, "(Chain ID:", networkInfo.chainId.toString() + ")");
  console.log("=".repeat(60));

  const deployedContracts: Partial<DeployedContracts> = {};

  try {
    // Step 1: Deploy MockYieldManager
    console.log("\n📦 1. Deploying MockYieldManager...");
    const MockYieldManager = await ethers.getContractFactory("MockYieldManager");
    const mockYieldManager = await MockYieldManager.deploy();
    await mockYieldManager.waitForDeployment();
    const mockYieldManagerAddress = await mockYieldManager.getAddress();
    deployedContracts.mockYieldManager = mockYieldManager;
    console.log("✅ MockYieldManager deployed to:", mockYieldManagerAddress);

    // Step 2: Deploy YieldManager
    console.log("\n📦 2. Deploying YieldManager...");
    const YieldManager = await ethers.getContractFactory("YieldManager");
    const yieldManager = await YieldManager.deploy();
    await yieldManager.waitForDeployment();
    const yieldManagerAddress = await yieldManager.getAddress();
    deployedContracts.yieldManager = yieldManager;
    console.log("✅ YieldManager deployed to:", yieldManagerAddress);

    // Step 3: Deploy RewardNFT (Badge System)
    console.log("\n📦 3. Deploying RewardNFT (Badge System)...");
    const RewardNFT = await ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFT.deploy(
      deployer.address, // admin
      "Arisan+ Achievement Badges", // name
      "ARISAN" // symbol
    );
    await rewardNFT.waitForDeployment();
    const rewardNFTAddress = await rewardNFT.getAddress();
    deployedContracts.rewardNFT = rewardNFT;
    console.log("✅ RewardNFT deployed to:", rewardNFTAddress);

    // Step 4: Deploy PoolFactory
    console.log("\n📦 4. Deploying PoolFactory...");
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const poolFactory = await PoolFactory.deploy(deployer.address, rewardNFTAddress);
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    deployedContracts.poolFactory = poolFactory;
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    // Step 5: Deploy LotteryManager
    console.log("\n📦 5. Deploying LotteryManager...");
    const LotteryManager = await ethers.getContractFactory("LotteryManager");
    const lotteryManager = await LotteryManager.deploy(deployer.address, rewardNFTAddress);
    await lotteryManager.waitForDeployment();
    const lotteryManagerAddress = await lotteryManager.getAddress();
    deployedContracts.lotteryManager = lotteryManager;
    console.log("✅ LotteryManager deployed to:", lotteryManagerAddress);

    // Step 6: Configure Badge System Permissions
    console.log("\n🔐 6. Configuring Badge System Permissions...");
    
    const MINTER_ROLE = await rewardNFT.BADGE_MINTER_ROLE();
    const ADMIN_ROLE = await rewardNFT.BADGE_ADMIN_ROLE();

    // Grant minter role to PoolFactory
    await rewardNFT.grantRole(MINTER_ROLE, poolFactoryAddress);
    console.log("✅ Granted BADGE_MINTER_ROLE to PoolFactory");
    
    // Grant minter role to LotteryManager
    await rewardNFT.grantRole(MINTER_ROLE, lotteryManagerAddress);
    console.log("✅ Granted BADGE_MINTER_ROLE to LotteryManager");

    // Grant admin role to deployer (if not already granted)
    await rewardNFT.grantRole(ADMIN_ROLE, deployer.address);
    console.log("✅ Granted BADGE_ADMIN_ROLE to deployer");

    // Step 7: Configure Pool Factory Permissions
    console.log("\n🔐 7. Configuring Pool Factory Permissions...");
    
    const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
    const EMERGENCY_ADMIN_ROLE = await poolFactory.EMERGENCY_ADMIN_ROLE();

    // Grant pool creator role to deployer for testing
    await poolFactory.grantRole(POOL_CREATOR_ROLE, deployer.address);
    console.log("✅ Granted POOL_CREATOR_ROLE to deployer");

    // Grant emergency admin role to deployer
    await poolFactory.grantRole(EMERGENCY_ADMIN_ROLE, deployer.address);
    console.log("✅ Granted EMERGENCY_ADMIN_ROLE to deployer");

    // Step 8: Configure Lottery Manager Permissions
    console.log("\n🔐 8. Configuring Lottery Manager Permissions...");
    
    const LOTTERY_ADMIN_ROLE = await lotteryManager.LOTTERY_ADMIN_ROLE();

    // Grant lottery admin role to deployer
    await lotteryManager.grantRole(LOTTERY_ADMIN_ROLE, deployer.address);
    console.log("✅ Granted LOTTERY_ADMIN_ROLE to deployer");

    // Step 9: Configure Yield Manager Permissions
    console.log("\n🔐 9. Configuring Yield Manager Permissions...");
    
    const STRATEGY_MANAGER_ROLE = await yieldManager.STRATEGY_MANAGER_ROLE();

    // Grant strategy manager role to deployer
    await yieldManager.grantRole(STRATEGY_MANAGER_ROLE, deployer.address);
    console.log("✅ Granted STRATEGY_MANAGER_ROLE to deployer");

    // Step 10: Verify Deployments
    console.log("\n🔍 10. Verifying Deployments...");
    
    // Test MockYieldManager
    const mockYieldRate = await mockYieldManager.YIELD_RATE();
    console.log("✅ MockYieldManager yield rate:", (Number(mockYieldRate) / 100).toString() + "%");

    // Test YieldManager
    const yieldRate = await yieldManager.FIXED_APY();
    console.log("✅ YieldManager APY:", (Number(yieldRate) / 100).toString() + "%");

    // Test PoolFactory
    const poolStats = await poolFactory.getPoolStatistics();
    console.log("✅ PoolFactory stats:", {
      totalPools: poolStats.totalPools.toString(),
      activePools: poolStats.activePools.toString(),
      completedPools: poolStats.completedPools.toString()
    });

    // Test RewardNFT
    const badgeName = await rewardNFT.name();
    const badgeSymbol = await rewardNFT.symbol();
    console.log("✅ RewardNFT:", badgeName, "(" + badgeSymbol + ")");

    // Test LotteryManager
    const lotteryConfig = await lotteryManager.getLotteryConfig();
    console.log("✅ LotteryManager configured with prize pool percentage:", lotteryConfig.prizePoolPercentage.toString() + "%");

    console.log("\n🎉 All contracts deployed and configured successfully!");
    
    // Print final summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network:", networkInfo.name, "(Chain ID:", networkInfo.chainId.toString() + ")");
    console.log("Deployer:", deployer.address);
    console.log("Gas used: Check transaction receipts for detailed gas usage");
    
    console.log("\n📍 Contract Addresses:");
    console.log("┌─ MockYieldManager:", mockYieldManagerAddress);
    console.log("├─ YieldManager:", yieldManagerAddress);
    console.log("├─ RewardNFT (Badge):", rewardNFTAddress);
    console.log("├─ PoolFactory:", poolFactoryAddress);
    console.log("└─ LotteryManager:", lotteryManagerAddress);

    console.log("\n🔗 Frontend Configuration:");
    console.log("Add these to your .env.local file:");
    console.log("─".repeat(50));
    console.log(`NEXT_PUBLIC_HARDHAT_MOCK_YIELD_MANAGER=${mockYieldManagerAddress}`);
    console.log(`NEXT_PUBLIC_HARDHAT_YIELD_MANAGER=${yieldManagerAddress}`);
    console.log(`NEXT_PUBLIC_HARDHAT_BADGE=${rewardNFTAddress}`);
    console.log(`NEXT_PUBLIC_HARDHAT_POOL_FACTORY=${poolFactoryAddress}`);
    console.log(`NEXT_PUBLIC_HARDHAT_LOTTERY_MANAGER=${lotteryManagerAddress}`);

    console.log("\n🛡️ Security Notes:");
    console.log("- All admin roles granted to deployer address");
    console.log("- BADGE_MINTER_ROLE granted to PoolFactory and LotteryManager");
    console.log("- Remember to transfer admin roles to appropriate addresses in production");

    console.log("\n✨ Next Steps:");
    console.log("1. Update frontend environment variables");
    console.log("2. Run integration tests");
    console.log("3. Consider granting pool creator roles to other addresses");
    console.log("4. Set up monitoring and alerts for contract events");

    return {
      mockYieldManager: mockYieldManagerAddress,
      yieldManager: yieldManagerAddress,
      rewardNFT: rewardNFTAddress,
      poolFactory: poolFactoryAddress,
      lotteryManager: lotteryManagerAddress
    };

  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    
    // Cleanup information
    console.log("\n🧹 Cleanup Information:");
    if (Object.keys(deployedContracts).length > 0) {
      console.log("Partially deployed contracts:");
      for (const [name, contract] of Object.entries(deployedContracts)) {
        if (contract) {
          console.log(`- ${name}:`, await contract.getAddress());
        }
      }
    }
    
    process.exit(1);
  }
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎯 Deployment completed successfully!");
    console.log("Contract addresses returned:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error during deployment:");
    console.error(error);
    process.exit(1);
  });
