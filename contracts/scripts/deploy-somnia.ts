import { ethers } from "hardhat";
import { updateWebConfig } from "./update-web-config";
import { saveDeployment } from "./deployment-utils";

async function main() {
  console.log("🌟 Starting deployment to Somnia testnet...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Check if we're on the correct network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 50312n) {
    console.warn("⚠️  Warning: Not on Somnia testnet (Chain ID: 50312)");
    console.log("Current Chain ID:", network.chainId.toString());
  }

  try {
    // Deploy YieldManager first (real YieldManager for testnet, not Mock)
    console.log("\n📦 1. Deploying YieldManager...");
    const YieldManager = await ethers.getContractFactory("YieldManager");
    const yieldManager = await YieldManager.deploy();
    await yieldManager.waitForDeployment();
    const yieldManagerAddress = await yieldManager.getAddress();
    console.log("✅ YieldManager deployed to:", yieldManagerAddress);

    // Wait for a few blocks to ensure deployment is confirmed
    console.log("⏳ Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    console.log("\n📦 2. Deploying PoolFactory...");
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    // Note: Using zero addresses as placeholders for RewardNFT and LotteryManager
    const poolFactory = await PoolFactory.deploy(
      deployer.address,     // factory owner
      ethers.ZeroAddress,   // rewardNFT placeholder
      ethers.ZeroAddress    // lotteryManager placeholder
    );
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    // Wait for deployment confirmation
    console.log("⏳ Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    console.log("\n🌟 Somnia Testnet Deployment Complete!");
    console.log("─".repeat(50));
    console.log("Network: Somnia Testnet (Chain ID: 50312)");
    console.log("YieldManager:", yieldManagerAddress);
    console.log("PoolFactory:", poolFactoryAddress);
    console.log("Deployer:", deployer.address);

    // Save deployment record
    console.log("\n💾 Saving deployment record...");
    await saveDeployment({
      YieldManager: yieldManagerAddress,
      PoolFactory: poolFactoryAddress,
    }, deployer.address, `somnia-testnet-${Date.now()}`);

    // Update web config with new addresses
    console.log("\n🔄 Updating web configuration...");
    await updateWebConfig({
      yieldManager: yieldManagerAddress,
      poolFactory: poolFactoryAddress,
    }, 50312); // Somnia testnet chain ID

    console.log("\n📋 Next Steps:");
    console.log("1. Deploy Badge/RewardNFT contract if needed");
    console.log("2. Deploy LotteryManager if needed");
    console.log("3. Update PoolFactory with RewardNFT and LotteryManager addresses");
    console.log("4. Configure yield generation in YieldManager");
    console.log("5. Test the deployment with the frontend");

    console.log("\n🔧 Test Commands:");
    console.log("npx hardhat verify", yieldManagerAddress, "--network somnia");
    console.log("npx hardhat verify", poolFactoryAddress, deployer.address, ethers.ZeroAddress, ethers.ZeroAddress, "--network somnia");

  } catch (error) {
    console.error("❌ Somnia testnet deployment failed:", error);
    
    // Provide helpful error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      
      if (error.message.includes("insufficient funds")) {
        console.log("\n💡 Solution: Fund your deployer account with testnet ETH");
        console.log("Deployer address:", deployer.address);
      }
      
      if (error.message.includes("network")) {
        console.log("\n💡 Solution: Check your network configuration");
        console.log("Make sure SOMNIA_RPC_URL is set in your .env file");
        console.log("Current network:", network.name);
      }
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
