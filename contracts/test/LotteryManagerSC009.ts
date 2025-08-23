import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("LotteryManager SC-009 Validation", function () {
    
    async function deployLotteryManagerFixture() {
        const [admin, poolContract, user1, user2, user3] = await hre.ethers.getSigners();

        // Deploy LotteryManager
        const LotteryManagerFactory = await hre.ethers.getContractFactory("LotteryManager");
        const lotteryManager = await LotteryManagerFactory.deploy(admin.address);

        // Grant POOL_ROLE to poolContract
        const POOL_ROLE = await lotteryManager.POOL_ROLE();
        await lotteryManager.grantRole(POOL_ROLE, poolContract.address);

        // Update lottery config to allow smaller pools for testing
        const testConfig = {
            drawInterval: 7 * 24 * 60 * 60, // 7 days
            prizePercentage: 1000, // 10%
            minPoolSize: 2, // Lower minimum for testing
            maxPrizeAmount: hre.ethers.parseEther("10"),
            isActive: true
        };
        await lotteryManager.updateLotteryConfig(testConfig);

        // Fund the lottery contract for testing
        await admin.sendTransaction({
            to: await lotteryManager.getAddress(),
            value: hre.ethers.parseEther("10")
        });

        return {
            lotteryManager,
            admin,
            poolContract,
            user1,
            user2,
            user3
        };
    }

    describe("Core SC-009 Functionality", function () {
        it("Should track global lottery statistics", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const [totalDraws, totalPrizesDistributed, totalParticipants, averagePrizeAmount] = 
                await lotteryManager.getGlobalLotteryStats();

            // Initially no draws
            expect(totalDraws).to.equal(0);
            expect(totalPrizesDistributed).to.equal(0);
            expect(totalParticipants).to.equal(0);
            expect(averagePrizeAmount).to.equal(0);
        });

        it("Should return detailed participant history for new participants", async function () {
            const { lotteryManager, user1 } = await loadFixture(deployLotteryManagerFixture);
            
            const [draws, totalWon, winCount, participationCount] = 
                await lotteryManager.getDetailedParticipantHistory(user1.address);

            expect(draws.length).to.equal(0);
            expect(totalWon).to.equal(0);
            expect(winCount).to.equal(0);
            expect(participationCount).to.equal(0);
        });

        it("Should return empty leaderboard when no winners exist", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const [winners, amounts] = await lotteryManager.getLotteryLeaderboard(10);
            
            expect(winners.length).to.equal(0);
            expect(amounts.length).to.equal(0);
        });

        it("Should handle time range queries with no draws", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const now = await time.latest();
            const draws = await lotteryManager.getDrawsByTimeRange(now - 3600, now + 3600);
            
            expect(draws.length).to.equal(0);
        });

        it("Should accept prize pool funding from pools", async function () {
            const { lotteryManager, poolContract } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            const fundingAmount = hre.ethers.parseEther("1");

            await expect(
                lotteryManager.connect(poolContract).fundPrizePool(poolId, { value: fundingAmount })
            ).to.emit(lotteryManager, "PrizePoolFunded");
        });

        it("Should calculate prize amounts correctly", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            // Add participants to pool
            const poolId = 1;
            const participants = [user1.address, user2.address, user3.address];
            const weights = [100, 150, 200];

            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                participants,
                weights
            );
            
            const prizeAmount = await lotteryManager.calculatePrizeAmount(poolId);
            
            // Expected: 3 participants * 0.01 ETH * 1000 basis points / 10000 = 0.003 ETH
            expect(prizeAmount).to.equal(hre.ethers.parseEther("0.003"));
        });

        it("Should maintain pool lottery statistics", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            // Initially no statistics for pool
            const [totalDraws, totalPrizes, lastDrawTime] = 
                await lotteryManager.getPoolLotteryStats(1);

            expect(totalDraws).to.equal(0);
            expect(totalPrizes).to.equal(0);
            expect(lastDrawTime).to.equal(0);
        });

        it("Should handle batch processing with empty array", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            // Should not revert with empty array
            await expect(lotteryManager.batchProcessDraws([])).to.not.be.reverted;
        });

        it("Should maintain lottery configuration", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const config = await lotteryManager.getLotteryConfig();
            
            expect(config.drawInterval).to.equal(7 * 24 * 60 * 60);
            expect(config.prizePercentage).to.equal(1000); // 10%
            expect(config.minPoolSize).to.equal(2);
            expect(config.isActive).to.be.true;
        });

        it("Should validate enhanced interface compliance", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            // Verify new functions exist and are callable
            await expect(lotteryManager.getDetailedParticipantHistory(hre.ethers.ZeroAddress)).to.not.be.reverted;
            await expect(lotteryManager.getLotteryLeaderboard(5)).to.not.be.reverted;
            await expect(lotteryManager.getDrawsByTimeRange(0, 1000)).to.not.be.reverted;
            await expect(lotteryManager.getGlobalLotteryStats()).to.not.be.reverted;
        });
    });

    describe("Enhanced Prize Distribution Features", function () {
        it("Should handle prize distribution with yield check for non-existent draw", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            // Should revert for non-existent draw
            await expect(lotteryManager.distributePrizeWithYieldCheck(999))
                .to.be.revertedWithCustomError(lotteryManager, "DrawNotFound");
        });

        it("Should get pool yield for prize calculation safely", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            // Should return 0 for non-existent pool without reverting
            const weeklyYield = await lotteryManager.getPoolYieldForPrize(999);
            expect(weeklyYield).to.equal(0);
        });
    });

    describe("Security and Access Control", function () {
        it("Should prevent non-pool addresses from funding prize pool", async function () {
            const { lotteryManager, user1 } = await loadFixture(deployLotteryManagerFixture);
            
            await expect(
                lotteryManager.connect(user1).fundPrizePool(1, { value: hre.ethers.parseEther("1") })
            ).to.be.reverted;
        });

        it("Should allow emergency withdraw by admin", async function () {
            const { lotteryManager, admin } = await loadFixture(deployLotteryManagerFixture);
            
            const withdrawAmount = hre.ethers.parseEther("1");
            
            await expect(lotteryManager.connect(admin).emergencyWithdraw(withdrawAmount))
                .to.not.be.reverted;
        });

        it("Should prevent emergency withdraw by non-admin", async function () {
            const { lotteryManager, user1 } = await loadFixture(deployLotteryManagerFixture);
            
            const withdrawAmount = hre.ethers.parseEther("1");
            
            await expect(lotteryManager.connect(user1).emergencyWithdraw(withdrawAmount))
                .to.be.reverted;
        });
    });
});
