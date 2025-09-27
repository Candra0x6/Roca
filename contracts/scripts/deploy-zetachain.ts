import { ethers } from "hardhat";    
import { updateWebConfig } from "./update-web-config";
import { saveDeployment } from "./deployment-utils";

async function main() {
  console.log("🌟 Starting deployment to ZetaChain Athens 3 testnet...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "aZETA");

  // Check if we're on the correct network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 7001n) {
    console.warn("⚠️  Warning: Not on ZetaChain Athens 3 testnet (Chain ID: 7001)");
    console.log("Current Chain ID:", network.chainId.toString());
  }

  try {
    // Set up gas configuration for ZetaChain
    const gasPrice = ethers.parseUnits("30", "gwei"); // 20 Gwei
    const gasLimit = 8000000;
    
    console.log("\n📦 1. Deploying YieldManager...");
    const YieldManager = await ethers.getContractFactory("YieldManager");
    const yieldManager = await YieldManager.deploy({
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
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
      ethers.ZeroAddress,   // lotteryManager placeholder
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ PoolFactory deployed to:", poolFactoryAddress);

    // Wait for deployment confirmation
    console.log("⏳ Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    console.log("\n🌟 ZetaChain Athens 3 Testnet Deployment Complete!");
    console.log("─".repeat(50));
    console.log("Network: ZetaChain Athens 3 Testnet (Chain ID: 7001)");
    console.log("YieldManager:", yieldManagerAddress);
    console.log("PoolFactory:", poolFactoryAddress);
    console.log("Deployer:", deployer.address);


    // Save deployment record
    console.log("\n💾 Saving deployment record...");
    await saveDeployment({
      YieldManager: yieldManagerAddress,
      PoolFactory: poolFactoryAddress,
    }, deployer.address, `zetachain-athens3-${Date.now()}`);

    // Update web config with new addresses
    console.log("\n🔄 Updating web configuration...");
    await updateWebConfig({
      yieldManager: yieldManagerAddress,
      poolFactory: poolFactoryAddress,
    }, 7001); // ZetaChain Athens 3 chain ID

    console.log("\n📋 Next Steps:");
    console.log("1. Fund YieldManager with aZETA for yield generation");
    console.log("2. Test pool creation and joining functionality");
    console.log("3. Test lottery and badge systems");
    console.log("4. Verify contracts on ZetaScan explorer");
    console.log("5. Test the deployment with the frontend");

    console.log("\n🔧 Test Commands:");
    console.log("npx hardhat verify", yieldManagerAddress, "--network zetachain");
    console.log("npx hardhat verify", poolFactoryAddress, deployer.address, ethers.ZeroAddress, ethers.ZeroAddress, "--network zetachain");

    console.log("\n💰 Fund the YieldManager:");
    console.log("Send some aZETA to YieldManager for yield generation:");
    console.log("Address:", yieldManagerAddress);

  } catch (error) {
    console.error("❌ ZetaChain Athens 3 testnet deployment failed:", error);
    
    // Provide helpful error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      
      if (error.message.includes("insufficient funds")) {
        console.log("\n💡 Solution: Fund your deployer account with aZETA");
        console.log("Deployer address:", deployer.address);
        console.log("Get aZETA from: https://labs.zetachain.com/get-zeta");
      }
      
      if (error.message.includes("network")) {
        console.log("\n💡 Solution: Check your network configuration");
        console.log("Make sure ZETACHAIN_RPC_URL is set in your .env file");
        console.log("Current network:", network.name);
      }

      if (error.message.includes("gas")) {
        console.log("\n💡 Solution: Try adjusting gas settings");
        console.log("ZetaChain may require higher gas limits or prices");
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