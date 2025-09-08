import { ethers } from "hardhat";
import { updateWebConfig } from "./update-web-config";

async function main() {
  console.log("🧪 Starting deployment for development/testing environment...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  try {
    // Deploy only MockYieldManager and PoolFactory for development
    console.log("\n📦 1. Deploying MockYieldManager...");
    const MockYieldManager = await ethers.getContractFactory("MockYieldManager");
    const mockYieldManager = await MockYieldManager.deploy();
    await mockYieldManager.waitForDeployment();
    const mockYieldManagerAddress = await mockYieldManager.getAddress();
    console.log("✅ MockYieldManager deployed to:", mockYieldManagerAddress);

    // Fund MockYieldManager with 1000 ETH for development
    console.log("\n💰 Funding MockYieldManager with 1000 ETH...");
    const fundingAmount = ethers.parseEther("1000");
    const fundingTx = await deployer.sendTransaction({
      to: mockYieldManagerAddress,
      value: fundingAmount
    });
    await fundingTx.wait();
    const mockYieldManagerBalance = await ethers.provider.getBalance(mockYieldManagerAddress);
    console.log("✅ MockYieldManager funded with:", ethers.formatEther(mockYieldManagerBalance), "ETH");

    console.log("\n📦 2. Deploying PoolFactory...");
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    // Note: Using zero addresses as placeholders for RewardNFT and LotteryManager
    const poolFactory = await PoolFactory.deploy(
      deployer.address, 
      ethers.ZeroAddress,  // rewardNFT placeholder
      ethers.ZeroAddress   // lotteryManager placeholder
    );
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    console.log("\n� Simplified Deployment Complete!");
    console.log("─".repeat(40));
    console.log("MockYieldManager:", mockYieldManagerAddress);
    console.log("PoolFactory:", poolFactoryAddress);

    // Update web config with new addresses
    console.log("\n🔄 Updating web configuration...");
    await updateWebConfig({
      mockYieldManager: mockYieldManagerAddress,
      poolFactory: poolFactoryAddress,
    }, 31337);

    console.log("\n🔧 Quick Test Commands:");
    console.log("npx hardhat test --network localhost");

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