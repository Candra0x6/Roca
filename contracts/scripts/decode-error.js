const { ethers } = require("hardhat");

async function main() {
  // The error data from the failed transaction
  const errorData = "0xe2517d3f00000000000000000000000015d34aaf54267db7d7c367839aaf71a00a2c6a65b8179c2726c8d8961ef054875ab3f4c1c3d34e1cb429c3d5e0bc97958e4cab9d";
  
  try {
    // Get the PoolFactory contract
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    
    // Try to decode the error
    console.log("Error data:", errorData);
    console.log("Error signature (first 4 bytes):", errorData.slice(0, 10));
    
    // The error signature 0x98bfc6e9 might correspond to a custom error
    // Let's check what 0x0e10 means in decimal
    const errorValue = parseInt(errorData.slice(-4), 16);
    console.log("Error value (decimal):", errorValue);
    console.log("Error value (hex):", "0x" + errorValue.toString(16));
    
    // Check if it's related to duration - 0x0e10 = 3600 seconds = 1 hour
    console.log("If it's duration in seconds:", errorValue, "seconds =", errorValue / 3600, "hours");
    
    // Let's also check the contract interface to see what custom errors exist
    const contract = PoolFactory.interface;
    
    console.log("\nCustom errors in PoolFactory:");
    contract.forEachError((error, name) => {
      console.log(`- ${name}: ${error.selector}`);
    });
    
    // Try to decode specifically
    try {
      const decoded = contract.parseError(errorData);
      console.log("\nDecoded error:", decoded);
    } catch (e) {
      console.log("\nCould not decode error with contract interface");
    }
    
  } catch (error) {
    console.error("Error decoding:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
