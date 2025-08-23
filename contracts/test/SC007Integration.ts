import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("SC-007: Pool-YieldManager Integration Verification", function () {
    // Deploy fixture for testing integration
    async function deployFixture() {
        const [admin, creator, member1, member2] = await hre.ethers.getSigners();

        // Deploy YieldManager
        const YieldManager = await hre.ethers.getContractFactory("YieldManager");
        const yieldManager = await YieldManager.deploy();

        // Deploy PoolFactory
        const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
        const poolFactory = await PoolFactory.deploy();

        // Grant creator role
        const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
        await poolFactory.grantRole(POOL_CREATOR_ROLE, creator.address);

        return { poolFactory, yieldManager, admin, creator, member1, member2 };
    }

    describe("Integration Verification", function () {
        it("Should integrate Pool and YieldManager through PoolFactory", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployFixture);

            // 1. Create pool through factory
            const poolParams = {
                name: "Integration Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 60, // 1 minute
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            
            // Get pool address and ID
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            const poolAddress = await poolFactory.getPoolAddress(poolId);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(poolAddress);

            // 2. Verify pool knows its ID
            expect(await pool.getPoolId()).to.equal(poolId);

            // 3. Members join pool (triggers YieldManager integration)
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // 4. Verify funds are in YieldManager with correct poolId
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.poolId).to.equal(poolId);
            expect(investment.principalAmount).to.equal(hre.ethers.parseEther("2"));
            expect(investment.isActive).to.be.true;
            expect(investment.poolAddress).to.equal(poolAddress);

            // 5. Advance time and complete pool
            await time.increase(61);
            await pool.completePool();

            // 6. Verify investment is closed
            const completedInvestment = await yieldManager.getPoolInvestment(poolId);
            expect(completedInvestment.isActive).to.be.false;

            console.log("✅ SC-007 Integration successful:");
            console.log(`  - Pool ID: ${poolId}`);
            console.log(`  - Pool Address: ${poolAddress}`);
            console.log(`  - Principal Amount: ${hre.ethers.formatEther(investment.principalAmount)} ETH`);
            console.log(`  - YieldManager Integration: Working`);
        });

        it("Should work with MockYieldManager for testing scenarios", async function () {
            const { creator, member1, member2 } = await loadFixture(deployFixture);

            // Deploy MockYieldManager
            const MockYieldManager = await hre.ethers.getContractFactory("MockYieldManager");
            const mockYieldManager = await MockYieldManager.deploy();

            // Create pool directly (simulating test environment)
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = await Pool.deploy(
                "Test Pool",
                hre.ethers.parseEther("1"),
                2,
                60,
                creator.address,
                mockYieldManager.target
            );

            // Should use poolId 0 for testing
            expect(await pool.getPoolId()).to.equal(0);

            // Should still integrate with MockYieldManager
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // Pool should be active
            const poolInfo = await pool.getPoolInfo();
            expect(poolInfo.status).to.equal(2); // Active

            console.log("✅ Testing scenario verified:");
            console.log(`  - Pool ID (fallback): ${await pool.getPoolId()}`);
            console.log(`  - Status: Active`);
            console.log(`  - Integration: Working with fallback`);
        });
    });
});
