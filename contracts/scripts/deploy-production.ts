import { ethers } from "hardhat";

async function main() {
  console.log("🌐 Starting production deployment of Arisan+ contracts...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const networkInfo = await ethers.provider.getNetwork();
  
  // Production safety checks
  if (networkInfo.chainId === 31337n) {
    throw new Error("❌ Cannot deploy to local network with production script. Use deploy-dev.ts instead.");
  }

  if (balance < ethers.parseEther("0.5")) {
    throw new Error("❌ Insufficient balance for production deployment. Need at least 0.5 ETH.");
  }

  console.log("Network:", networkInfo.name, "(Chain ID:", networkInfo.chainId.toString() + ")");
  console.log("⚠️  Production deployment - please verify all parameters");

  // Wait for confirmation
  console.log("\n⏳ Waiting 10 seconds before deployment...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    // Deploy YieldManager (production version, not mock)
    console.log("\n📦 1. Deploying YieldManager (Production)...");
    const YieldManager = await ethers.getContractFactory("YieldManager");
    const yieldManager = await YieldManager.deploy();
    await yieldManager.waitForDeployment();
    const yieldManagerAddress = await yieldManager.getAddress();
    console.log("✅ YieldManager deployed to:", yieldManagerAddress);

    // Deploy RewardNFT
    console.log("\n📦 2. Deploying RewardNFT...");
    const RewardNFT = await ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFT.deploy(
      deployer.address,
      "Arisan+ Achievement Badges",
      "ARISAN"
    );
    await rewardNFT.waitForDeployment();
    const rewardNFTAddress = await rewardNFT.getAddress();
    console.log("✅ RewardNFT deployed to:", rewardNFTAddress);

    // Deploy PoolFactory
    console.log("\n📦 3. Deploying PoolFactory...");
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const poolFactory = await PoolFactory.deploy(deployer.address, rewardNFTAddress);
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    // Deploy LotteryManager
    console.log("\n📦 4. Deploying LotteryManager...");
    const LotteryManager = await ethers.getContractFactory("LotteryManager");
    const lotteryManager = await LotteryManager.deploy(deployer.address, rewardNFTAddress);
    await lotteryManager.waitForDeployment();
    const lotteryManagerAddress = await lotteryManager.getAddress();
    console.log("✅ LotteryManager deployed to:", lotteryManagerAddress);

    // Configure production permissions
    console.log("\n🔐 Configuring production permissions...");
    
    const MINTER_ROLE = await rewardNFT.BADGE_MINTER_ROLE();
    const STRATEGY_MANAGER_ROLE = await yieldManager.STRATEGY_MANAGER_ROLE();
    const LOTTERY_ADMIN_ROLE = await lotteryManager.LOTTERY_ADMIN_ROLE();

    // Grant essential roles
    await rewardNFT.grantRole(MINTER_ROLE, poolFactoryAddress);
    await rewardNFT.grantRole(MINTER_ROLE, lotteryManagerAddress);
    await yieldManager.grantRole(STRATEGY_MANAGER_ROLE, deployer.address);
    await lotteryManager.grantRole(LOTTERY_ADMIN_ROLE, deployer.address);

    console.log("✅ Production permissions configured");

    // Verify deployments
    console.log("\n🔍 Verifying production deployments...");
    
    const yieldAPY = await yieldManager.FIXED_APY();
    const badgeName = await rewardNFT.name();
    const poolStats = await poolFactory.getPoolStatistics();

    console.log("✅ YieldManager APY:", (Number(yieldAPY) / 100).toString() + "%");
    console.log("✅ Badge contract:", badgeName);
    console.log("✅ PoolFactory initialized");

    console.log("\n🎉 Production deployment completed successfully!");
    
    console.log("\n" + "=".repeat(60));
    console.log("📋 PRODUCTION DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("Network:", networkInfo.name);
    console.log("Chain ID:", networkInfo.chainId.toString());
    console.log("Deployer:", deployer.address);
    
    console.log("\n📍 Contract Addresses:");
    console.log("YieldManager:", yieldManagerAddress);
    console.log("RewardNFT:", rewardNFTAddress);
    console.log("PoolFactory:", poolFactoryAddress);
    console.log("LotteryManager:", lotteryManagerAddress);

    console.log("\n🔒 Security Checklist:");
    console.log("□ Verify contract source code on block explorer");
    console.log("□ Set up monitoring for contract events");
    console.log("□ Configure multi-sig for admin roles");
    console.log("□ Set up emergency pause mechanisms");
    console.log("□ Configure proper access controls");

    console.log("\n⚠️  Post-deployment Actions Required:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Transfer admin roles to multi-sig wallet");
    console.log("3. Set up monitoring and alerting");
    console.log("4. Update frontend configuration");
    console.log("5. Conduct final security audit");

  } catch (error) {
    console.error("❌ Production deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
