import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of Arisan+ contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy MockYieldManager first
  console.log("\n1. Deploying MockYieldManager...");
  const MockYieldManager = await ethers.getContractFactory("MockYieldManager");
  const mockYieldManager = await MockYieldManager.deploy();
  await mockYieldManager.waitForDeployment();
  const mockYieldManagerAddress = await mockYieldManager.getAddress();
  console.log("MockYieldManager deployed to:", mockYieldManagerAddress);

  // Deploy RewardNFT (Badge contract)
  console.log("\n2. Deploying RewardNFT (Badge System)...");
  const RewardNFT = await ethers.getContractFactory("RewardNFT");
  const rewardNFT = await RewardNFT.deploy(
    deployer.address, // admin
    "Arisan+ Achievement Badges", // name
    "ARISAN" // symbol
  );
  await rewardNFT.waitForDeployment();
  const rewardNFTAddress = await rewardNFT.getAddress();
  console.log("RewardNFT deployed to:", rewardNFTAddress);

  // Deploy PoolFactory
  console.log("\n3. Deploying PoolFactory...");
  const PoolFactory = await ethers.getContractFactory("PoolFactory");
  const poolFactory = await PoolFactory.deploy(deployer.address, rewardNFTAddress);
  await poolFactory.waitForDeployment();
  const poolFactoryAddress = await poolFactory.getAddress();
  console.log("PoolFactory deployed to:", poolFactoryAddress);

  // Deploy LotteryManager
  console.log("\n4. Deploying LotteryManager...");
  const LotteryManager = await ethers.getContractFactory("LotteryManager");
  const lotteryManager = await LotteryManager.deploy(deployer.address, rewardNFTAddress);
  await lotteryManager.waitForDeployment();
  const lotteryManagerAddress = await lotteryManager.getAddress();
  console.log("LotteryManager deployed to:", lotteryManagerAddress);

  // Set up Badge contract permissions
  console.log("\n5. Setting up Badge contract permissions...");
  
  // Grant minter role to PoolFactory and LotteryManager
  const MINTER_ROLE = await rewardNFT.BADGE_MINTER_ROLE();
  await rewardNFT.grantRole(MINTER_ROLE, poolFactoryAddress);
  console.log("Granted BADGE_MINTER_ROLE to PoolFactory");
  
  await rewardNFT.grantRole(MINTER_ROLE, lotteryManagerAddress);
  console.log("Granted BADGE_MINTER_ROLE to LotteryManager");

  // Verify contracts are working
  console.log("\n6. Verifying deployments...");
  
  // Test PoolFactory
  const poolStats = await poolFactory.getPoolStatistics();
  console.log("PoolFactory stats:", {
    totalPools: poolStats.totalPools.toString(),
    activePools: poolStats.activePools.toString(),
    completedPools: poolStats.completedPools.toString()
  });

  // Test MockYieldManager
  const yieldRate = await mockYieldManager.YIELD_RATE();
  console.log("MockYieldManager yield rate:", (Number(yieldRate) / 100).toString() + "%");

  console.log("\n✅ All contracts deployed successfully!");
  
  // Print summary
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("Network:", await ethers.provider.getNetwork());
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("- MockYieldManager:", mockYieldManagerAddress);
  console.log("- RewardNFT (Badge):", rewardNFTAddress);
  console.log("- PoolFactory:", poolFactoryAddress);
  console.log("- LotteryManager:", lotteryManagerAddress);

  console.log("\n📝 Frontend Configuration:");
  console.log("Update your .env.local with:");
  console.log(`NEXT_PUBLIC_HARDHAT_POOL_FACTORY=${poolFactoryAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_BADGE=${rewardNFTAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_YIELD_MANAGER=${mockYieldManagerAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_LOTTERY_MANAGER=${lotteryManagerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
