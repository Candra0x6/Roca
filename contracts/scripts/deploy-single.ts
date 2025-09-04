import { ethers } from "hardhat";

/**
 * Quick deployment script for testing individual contracts
 * Usage: npx hardhat run scripts/deploy-single.ts --network localhost
 */

async function main() {
  const contractName = process.env.CONTRACT_NAME || "MockYieldManager";
  
  console.log(`🚀 Deploying ${contractName}...`);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  try {
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    let contract;
    
    // Handle different constructor parameters
    switch (contractName) {
      case "MockYieldManager":
      case "YieldManager":
        contract = await ContractFactory.deploy();
        break;
        
      case "RewardNFT":
        contract = await ContractFactory.deploy(
          deployer.address,
          "Test Badges",
          "TEST"
        );
        break;
        
      case "PoolFactory":
        // Need Badge contract address
        const badgeAddress = process.env.BADGE_ADDRESS;
        if (!badgeAddress) {
          throw new Error("BADGE_ADDRESS environment variable required for PoolFactory");
        }
        contract = await ContractFactory.deploy(deployer.address, badgeAddress);
        break;
        
      case "LotteryManager":
        // Need Badge contract address
        const badgeAddr = process.env.BADGE_ADDRESS;
        if (!badgeAddr) {
          throw new Error("BADGE_ADDRESS environment variable required for LotteryManager");
        }
        contract = await ContractFactory.deploy(deployer.address, badgeAddr);
        break;
        
      default:
        // Try no parameters first
        contract = await ContractFactory.deploy();
        break;
    }
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`✅ ${contractName} deployed to:`, address);
    
    // Basic verification
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      console.error("❌ No code at deployed address!");
    } else {
      console.log("✅ Contract code verified");
    }
    
    return address;
    
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error);
    process.exit(1);
  }
}

main()
  .then((address) => {
    console.log("🎉 Deployment completed!");
    console.log("Contract address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
