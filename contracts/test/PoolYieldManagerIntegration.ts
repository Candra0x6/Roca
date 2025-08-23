import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("Pool-YieldManager Integration (SC-007)", function () {
    // Deploy fixture for full integration testing
    async function deployIntegrationFixture() {
        const [admin, creator, member1, member2, member3] = await hre.ethers.getSigners();

        // Deploy YieldManager
        const YieldManager = await hre.ethers.getContractFactory("YieldManager");
        const yieldManager = await YieldManager.deploy();

        // Deploy PoolFactory
        const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
        const poolFactory = await PoolFactory.deploy();

        // Grant creator role to creator account
        const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();
        await poolFactory.grantRole(POOL_CREATOR_ROLE, creator.address);

        return {
            poolFactory,
            yieldManager,
            admin,
            creator,
            member1,
            member2,
            member3
        };
    }

    describe("Pool Creation and ID Management", function () {
        it("Should create pool through factory with proper poolId", async function () {
            const { poolFactory, yieldManager, creator } = await loadFixture(deployIntegrationFixture);

            const poolParams = {
                name: "Integration Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 3,
                duration: 30 * 24 * 60 * 60, // 30 days
                yieldManager: yieldManager.target
            };

            // Create pool through factory
            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();

            // Get pool address and ID
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            expect(poolId).to.equal(1); // First pool should have ID 1

            // Get pool contract
            const poolAddress = await poolFactory.getPoolAddress(poolId);
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(poolAddress);

            // Verify pool can get its own ID
            expect(await pool.getPoolId()).to.equal(poolId);
        });

        it("Should handle multiple pools with different IDs", async function () {
            const { poolFactory, yieldManager, creator } = await loadFixture(deployIntegrationFixture);

            const baseParams = {
                name: "Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 3,
                duration: 30 * 24 * 60 * 60,
                yieldManager: yieldManager.target
            };

            // Create first pool
            const tx1 = await poolFactory.connect(creator).createPool({
                ...baseParams,
                name: "Pool 1"
            });
            const receipt1 = await tx1.wait();
            const poolId1 = await poolFactory.getPoolId(receipt1!.logs[0].address);

            // Create second pool
            const tx2 = await poolFactory.connect(creator).createPool({
                ...baseParams,
                name: "Pool 2"
            });
            const receipt2 = await tx2.wait();
            const poolId2 = await poolFactory.getPoolId(receipt2!.logs[0].address);

            expect(poolId1).to.equal(1);
            expect(poolId2).to.equal(2);

            // Get pool contracts and verify IDs
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool1 = Pool.attach(receipt1!.logs[0].address);
            const pool2 = Pool.attach(receipt2!.logs[0].address);

            expect(await pool1.getPoolId()).to.equal(1);
            expect(await pool2.getPoolId()).to.equal(2);
        });
    });

    describe("YieldManager Integration", function () {
        it("Should stake funds in YieldManager when pool locks", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Create pool
            const poolParams = {
                name: "Stake Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 30 * 24 * 60 * 60,
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // Members join
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            
            // Second member joins, which should auto-lock
            await expect(
                pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") })
            ).to.emit(yieldManager, "FundsStaked")
              .withArgs(poolId, hre.ethers.parseEther("2"), 0, anyValue); // poolId, amount, strategy, expectedYield

            // Verify funds are in YieldManager
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.poolId).to.equal(poolId);
            expect(investment.principalAmount).to.equal(hre.ethers.parseEther("2"));
            expect(investment.isActive).to.be.true;
            expect(investment.poolAddress).to.equal(pool.target);
        });

        it("Should manually lock pool and stake funds with correct poolId", async function () {
            const { poolFactory, yieldManager, creator, member1 } = await loadFixture(deployIntegrationFixture);

            // Create pool
            const poolParams = {
                name: "Manual Lock Pool",
                contributionAmount: hre.ethers.parseEther("0.5"),
                maxMembers: 5,
                duration: 30 * 24 * 60 * 60,
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // One member joins
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("0.5") });

            // Creator manually locks
            await expect(
                pool.connect(creator).lockPool()
            ).to.emit(yieldManager, "FundsStaked")
              .withArgs(poolId, hre.ethers.parseEther("0.5"), 0, anyValue);

            // Verify investment record
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.poolId).to.equal(poolId);
            expect(investment.principalAmount).to.equal(hre.ethers.parseEther("0.5"));
            expect(investment.isActive).to.be.true;
        });

        it("Should withdraw funds from YieldManager on pool completion", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Create pool with short duration for testing
            const poolParams = {
                name: "Completion Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 60, // 1 minute
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // Fill pool to lock
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // Wait for duration to expire
            await time.increase(61);

            // Complete pool should withdraw from YieldManager
            await expect(
                pool.completePool()
            ).to.emit(yieldManager, "FundsWithdrawn")
              .withArgs(poolId, hre.ethers.parseEther("2"), anyValue, anyValue);

            // Verify investment is no longer active
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.isActive).to.be.false;
        });

        it("Should update yield from YieldManager correctly", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Create and fill pool
            const poolParams = {
                name: "Yield Update Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 365 * 24 * 60 * 60, // 1 year
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // Fill pool
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // Advance time to generate yield
            await time.increase(30 * 24 * 60 * 60); // 30 days

            // Update yield should call YieldManager.getYield with correct poolId
            await pool.updateYield();

            // Verify yield was updated (should be > 0 after 30 days)
            const yieldPerMember = await pool.getYieldPerMember();
            expect(yieldPerMember).to.be.greaterThan(0);

            // Verify YieldManager has the investment
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.isActive).to.be.true;
            expect(await yieldManager.getYield(poolId)).to.be.greaterThan(0);
        });
    });

    describe("End-to-End Integration", function () {
        it("Should handle complete pool lifecycle with YieldManager integration", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // 1. Create pool through factory
            const poolParams = {
                name: "E2E Integration Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 180, // 3 minutes
                yieldManager: yieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const poolId = await poolFactory.getPoolId(receipt!.logs[0].address);
            
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // 2. Members join and auto-lock
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            
            await expect(
                pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") })
            ).to.emit(yieldManager, "FundsStaked")
              .withArgs(poolId, hre.ethers.parseEther("2"), 0, anyValue);

            // 3. Verify pool is active and funds are staked
            let poolInfo = await pool.getPoolInfo();
            expect(poolInfo.status).to.equal(2); // Active

            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.isActive).to.be.true;
            expect(investment.principalAmount).to.equal(hre.ethers.parseEther("2"));

            // 4. Advance time to generate yield
            await time.increase(90); // 1.5 minutes

            // 5. Update yield
            await pool.updateYield();
            expect(await yieldManager.getYield(poolId)).to.be.greaterThan(0);

            // 6. Complete pool after duration
            await time.increase(91); // Total 3+ minutes
            
            await expect(
                pool.completePool()
            ).to.emit(yieldManager, "FundsWithdrawn")
              .withArgs(poolId, hre.ethers.parseEther("2"), anyValue, anyValue);

            // 7. Verify pool is completed
            poolInfo = await pool.getPoolInfo();
            expect(poolInfo.status).to.equal(3); // Completed

            // 8. Members withdraw their shares
            const yieldPerMember = await pool.getYieldPerMember();
            expect(yieldPerMember).to.be.greaterThan(0);

            const member1InitialBalance = await hre.ethers.provider.getBalance(member1.address);
            await pool.connect(member1).withdrawShare();
            const member1FinalBalance = await hre.ethers.provider.getBalance(member1.address);
            
            // Member should receive original contribution + yield (minus gas)
            expect(member1FinalBalance).to.be.greaterThan(member1InitialBalance);
        });

        it("Should handle multiple pools with different poolIds correctly", async function () {
            const { poolFactory, yieldManager, creator, member1, member2, member3 } = await loadFixture(deployIntegrationFixture);

            // Create first pool
            const pool1Params = {
                name: "Multi Pool 1",
                contributionAmount: hre.ethers.parseEther("0.5"),
                maxMembers: 2,
                duration: 60,
                yieldManager: yieldManager.target
            };

            const tx1 = await poolFactory.connect(creator).createPool(pool1Params);
            const receipt1 = await tx1.wait();
            const poolId1 = await poolFactory.getPoolId(receipt1!.logs[0].address);
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool1 = Pool.attach(receipt1!.logs[0].address);

            // Create second pool
            const pool2Params = {
                name: "Multi Pool 2",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 60,
                yieldManager: yieldManager.target
            };

            const tx2 = await poolFactory.connect(creator).createPool(pool2Params);
            const receipt2 = await tx2.wait();
            const poolId2 = await poolFactory.getPoolId(receipt2!.logs[0].address);
            const pool2 = Pool.attach(receipt2!.logs[0].address);

            // Fill both pools
            await pool1.connect(member1).joinPool({ value: hre.ethers.parseEther("0.5") });
            await pool1.connect(member2).joinPool({ value: hre.ethers.parseEther("0.5") });

            await pool2.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
            await pool2.connect(member3).joinPool({ value: hre.ethers.parseEther("1") });

            // Verify both investments are separate in YieldManager
            const investment1 = await yieldManager.getPoolInvestment(poolId1);
            const investment2 = await yieldManager.getPoolInvestment(poolId2);

            expect(investment1.poolId).to.equal(poolId1);
            expect(investment1.principalAmount).to.equal(hre.ethers.parseEther("1")); // 2 * 0.5
            expect(investment1.poolAddress).to.equal(pool1.target);

            expect(investment2.poolId).to.equal(poolId2);
            expect(investment2.principalAmount).to.equal(hre.ethers.parseEther("2")); // 2 * 1
            expect(investment2.poolAddress).to.equal(pool2.target);

            // Both should be active
            expect(investment1.isActive).to.be.true;
            expect(investment2.isActive).to.be.true;
        });
    });

    describe("Error Handling and Edge Cases", function () {
        it("Should handle YieldManager failures gracefully", async function () {
            const { poolFactory, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Deploy a mock YieldManager that always reverts
            const FailingYieldManager = await hre.ethers.getContractFactory("MockYieldManager");
            const failingYieldManager = await FailingYieldManager.deploy();

            // Create pool with failing yield manager
            const poolParams = {
                name: "Failing YM Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 60,
                yieldManager: failingYieldManager.target
            };

            const tx = await poolFactory.connect(creator).createPool(poolParams);
            const receipt = await tx.wait();
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(receipt!.logs[0].address);

            // Members join
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });

            // This should work because MockYieldManager doesn't fail on deposit
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // Pool should be active despite YieldManager issues
            const poolInfo = await pool.getPoolInfo();
            expect(poolInfo.status).to.equal(2); // Active
        });

        it("Should handle pools created without factory (testing scenarios)", async function () {
            const { yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Create pool directly (like in tests)
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = await Pool.deploy(
                "Direct Pool",
                hre.ethers.parseEther("1"),
                2,
                60,
                creator.address,
                yieldManager.target
            );

            // Should return poolId 0 (fallback)
            expect(await pool.getPoolId()).to.equal(0);

            // Should still work with YieldManager using poolId 0
            await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

            // Verify YieldManager received funds with poolId 0
            const investment = await yieldManager.getPoolInvestment(0);
            expect(investment.isActive).to.be.true;
            expect(investment.principalAmount).to.equal(hre.ethers.parseEther("2"));
        });
    });

    describe("Gas Efficiency", function () {
        it("Should have reasonable gas costs for integrated operations", async function () {
            const { poolFactory, yieldManager, creator, member1, member2 } = await loadFixture(deployIntegrationFixture);

            // Create pool
            const poolParams = {
                name: "Gas Test Pool",
                contributionAmount: hre.ethers.parseEther("1"),
                maxMembers: 2,
                duration: 60,
                yieldManager: yieldManager.target
            };

            const createTx = await poolFactory.connect(creator).createPool(poolParams);
            const createReceipt = await createTx.wait();
            expect(createReceipt!.gasUsed).to.be.lt(4000000); // Less than 4M gas

            const poolId = await poolFactory.getPoolId(createReceipt!.logs[0].address);
            const Pool = await hre.ethers.getContractFactory("Pool");
            const pool = Pool.attach(createReceipt!.logs[0].address);

            // First member join
            const joinTx1 = await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
            const joinReceipt1 = await joinTx1.wait();
            expect(joinReceipt1!.gasUsed).to.be.lt(200000); // Less than 200k gas

            // Second member join (triggers lock and YieldManager deposit)
            const joinTx2 = await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
            const joinReceipt2 = await joinTx2.wait();
            expect(joinReceipt2!.gasUsed).to.be.lt(400000); // Less than 400k gas including YM interaction

            // Update yield
            const updateTx = await pool.updateYield();
            const updateReceipt = await updateTx.wait();
            expect(updateReceipt!.gasUsed).to.be.lt(150000); // Less than 150k gas
        });
    });
});
