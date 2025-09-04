import { ethers } from "hardhat";

async function main() {
  console.log("🛠️  Configuring PoolFactory for development (disabling anti-spam)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Configuring with account:", deployer.address);

  // PoolFactory address from the deployment
  const poolFactoryAddress = process.env.POOL_FACTORY_ADDRESS || "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
  
  try {
    // Get the PoolFactory contract instance
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const poolFactory = PoolFactory.attach(poolFactoryAddress) as any;
    
    console.log("PoolFactory address:", poolFactoryAddress);
    
    // Get current constraints
    const currentConstraints = await poolFactory.getGlobalConstraints();
    console.log("Current constraints:", {
      maxTotalPools: currentConstraints.maxTotalPools.toString(),
      maxPoolsPerCreator: currentConstraints.maxPoolsPerCreator.toString(),
      maxActivePoolsPerCreator: currentConstraints.maxActivePoolsPerCreator.toString(),
      minTimeBetweenPools: currentConstraints.minTimeBetweenPools.toString(),
      enforceConstraints: currentConstraints.enforceConstraints
    });
    
    // Update constraints for development (remove time restrictions)
    const newConstraints = {
      maxTotalPools: 10000,
      maxPoolsPerCreator: 100,  // Increased for testing
      maxActivePoolsPerCreator: 20,  // Increased for testing
      minTimeBetweenPools: 0,   // Remove time restriction for development
      enforceConstraints: true
    };
    
    console.log("\n🔧 Updating constraints for development...");
    const tx = await poolFactory.updateGlobalConstraints(newConstraints);
    await tx.wait();
    
    console.log("✅ Constraints updated successfully!");
    
    // Verify the update
    const updatedConstraints = await poolFactory.getGlobalConstraints();
    console.log("\nUpdated constraints:", {
      maxTotalPools: updatedConstraints.maxTotalPools.toString(),
      maxPoolsPerCreator: updatedConstraints.maxPoolsPerCreator.toString(),
      maxActivePoolsPerCreator: updatedConstraints.maxActivePoolsPerCreator.toString(),
      minTimeBetweenPools: updatedConstraints.minTimeBetweenPools.toString(),
      enforceConstraints: updatedConstraints.enforceConstraints
    });
    
    console.log("\n🎉 PoolFactory is now configured for development!");
    console.log("✓ No time restrictions between pool creation");
    console.log("✓ Increased limits for testing");
    
  } catch (error) {
    console.error("❌ Failed to configure PoolFactory:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
