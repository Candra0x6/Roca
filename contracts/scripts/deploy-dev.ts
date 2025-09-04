import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Starting deployment for development/testing environment...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  try {
    // Deploy essential contracts for development with lottery integration
    console.log("\n📦 1. Deploying MockYieldManager...");
    const MockYieldManager = await ethers.getContractFactory("MockYieldManager");
    const mockYieldManager = await MockYieldManager.deploy();
    await mockYieldManager.waitForDeployment();
    const mockYieldManagerAddress = await mockYieldManager.getAddress();
    console.log("✅ MockYieldManager deployed to:", mockYieldManagerAddress);

    console.log("\n📦 2. Deploying RewardNFT...");
    const RewardNFT = await ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFT.deploy(
      deployer.address,
      "Arisan+ Dev Badges",
      "ARISAN_DEV"
    );
    await rewardNFT.waitForDeployment();
    const rewardNFTAddress = await rewardNFT.getAddress();
    console.log("✅ RewardNFT deployed to:", rewardNFTAddress);

    console.log("\n📦 3. Deploying LotteryManager...");
    const LotteryManager = await ethers.getContractFactory("LotteryManager");
    const lotteryManager = await LotteryManager.deploy(
      deployer.address,
      rewardNFTAddress
    );
    await lotteryManager.waitForDeployment();
    const lotteryManagerAddress = await lotteryManager.getAddress();
    console.log("✅ LotteryManager deployed to:", lotteryManagerAddress);

    console.log("\n📦 4. Deploying PoolFactory...");
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const poolFactory = await PoolFactory.deploy(
      deployer.address, 
      rewardNFTAddress,
      lotteryManagerAddress
    );
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    // Setup minimal permissions for development
    console.log("\n🔐 Setting up development permissions...");
    const MINTER_ROLE = await rewardNFT.BADGE_MINTER_ROLE();
    const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
    const POOL_ROLE = await lotteryManager.POOL_ROLE();

    // Grant badge minting permissions
    await rewardNFT.grantRole(MINTER_ROLE, poolFactoryAddress);
    await rewardNFT.grantRole(MINTER_ROLE, lotteryManagerAddress);
    
    // Grant pool creation permissions
    await poolFactory.grantRole(POOL_CREATOR_ROLE, deployer.address);
    
    // Grant pool role to factory (so pools can call lottery)
    await lotteryManager.grantRole(POOL_ROLE, poolFactoryAddress);

    console.log("✅ Development permissions configured");

    console.log("\n📋 Development Deployment Complete!");
    console.log("─".repeat(40));
    console.log("MockYieldManager:", mockYieldManagerAddress);
    console.log("RewardNFT:", rewardNFTAddress);
    console.log("LotteryManager:", lotteryManagerAddress);
    console.log("PoolFactory:", poolFactoryAddress);

    console.log("\n🔧 Quick Test Commands:");
    console.log("npx hardhat test test/fullFlow.test.ts --network localhost");
    console.log("npx hardhat test test/lotteryIntegrationFlow.test.ts --network localhost");

  } catch (error) {
    console.error("❌ Development deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
