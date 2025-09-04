import { ethers } from "hardhat";

async function main() {
  console.log("Granting POOL_CREATOR_ROLE to default accounts...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  
  // Get PoolFactory contract
  const poolFactory = await ethers.getContractAt("PoolFactory", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  
  // Grant role to first few accounts
  const accounts = [deployer.address, user1.address, user2.address];
  
  for (const account of accounts) {
    console.log(`Granting POOL_CREATOR_ROLE to ${account}...`);
    await poolFactory.grantPoolCreatorRole(account);
    console.log(`✅ Role granted to ${account}`);
  }
  
  console.log("All accounts now have POOL_CREATOR_ROLE!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
