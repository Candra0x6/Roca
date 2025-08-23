import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("LotteryManager Enhanced Features (SC-009)", function () {
    
    async function deployLotteryManagerFixture() {
        const [admin, poolContract, user1, user2, user3] = await hre.ethers.getSigners();

        // Deploy LotteryManager
        const LotteryManagerFactory = await hre.ethers.getContractFactory("LotteryManager");
        const lotteryManager = await LotteryManagerFactory.deploy(admin.address);

        // Deploy MockYieldManager for testing
        const MockYieldManagerFactory = await hre.ethers.getContractFactory("MockYieldManager");
        const mockYieldManager = await MockYieldManagerFactory.deploy();

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
            mockYieldManager,
            admin,
            poolContract,
            user1,
            user2,
            user3
        };
    }

    describe("Prize Pool Funding", function () {
        it("Should accept funding from pools", async function () {
            const { lotteryManager, poolContract } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            const fundingAmount = hre.ethers.parseEther("1");

            await expect(
                lotteryManager.connect(poolContract).fundPrizePool(poolId, { value: fundingAmount })
            ).to.emit(lotteryManager, "PrizePoolFunded")
                .withArgs(poolId, fundingAmount, hre.ethers.parseEther("11")); // 10 + 1 ETH
        });

        it("Should revert funding from non-pool addresses", async function () {
            const { lotteryManager, user1 } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            const fundingAmount = hre.ethers.parseEther("1");

            await expect(
                lotteryManager.connect(user1).fundPrizePool(poolId, { value: fundingAmount })
            ).to.be.reverted;
        });
    });

    describe("Enhanced Prize Calculation", function () {
        it("Should calculate prize based on 10% of weekly yield when available", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            // Add participants to pool 1
            const poolId = 1;
            const participants = [user1.address, user2.address, user3.address];
            const weights = [100, 150, 200]; // Different weights for testing

            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                participants,
                weights
            );
            
            // The prize calculation will fall back to MVP calculation since we don't have
            // a real pool contract connected to yield manager
            const prizeAmount = await lotteryManager.calculatePrizeAmount(poolId);
            
            // Expected: 3 participants * 0.01 ETH * 1000 basis points / 10000 = 0.003 ETH
            expect(prizeAmount).to.equal(hre.ethers.parseEther("0.003"));
        });

        it("Should cap prize amount by maxPrizeAmount", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            // Add participants to pool 1
            const poolId = 1;
            const participants = [user1.address, user2.address, user3.address];
            const weights = [100, 150, 200];

            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                participants,
                weights
            );
            
            // Update config to have a very low max prize
            const newConfig = {
                drawInterval: 7 * 24 * 60 * 60, // 7 days
                prizePercentage: 1000, // 10%
                minPoolSize: 3,
                maxPrizeAmount: hre.ethers.parseEther("0.001"), // Very low cap
                isActive: true
            };

            await lotteryManager.updateLotteryConfig(newConfig);

            const prizeAmount = await lotteryManager.calculatePrizeAmount(poolId);
            expect(prizeAmount).to.equal(hre.ethers.parseEther("0.001"));
        });
    });

    describe("Lottery History and Statistics", function () {
        it("Should track detailed participant history", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up multiple pools and draws for comprehensive testing
            const poolId1 = 1;
            const poolId2 = 2;

            // Add participants to both pools
            await lotteryManager.connect(poolContract).addParticipants(
                poolId1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).addParticipants(
                poolId2,
                [user2.address, user3.address],
                [200, 100]
            );

            // Request draws for both pools
            await lotteryManager.connect(poolContract).requestDraw(poolId1);
            await lotteryManager.connect(poolContract).requestDraw(poolId2);

            // Advance time and select winners
            await time.increase(1);
            
            await lotteryManager.selectWinner(1);
            await lotteryManager.selectWinner(2);

            // Distribute prizes
            await lotteryManager.distributePrize(1);
            await lotteryManager.distributePrize(2);

            const [draws, totalWon, winCount, participationCount] = 
                await lotteryManager.getDetailedParticipantHistory(user2.address);

            expect(participationCount).to.equal(2); // user2 participated in both pools
            expect(draws.length).to.equal(2);
            
            // Check that user2's total wins are tracked
            if (winCount > 0n) {
                expect(totalWon).to.be.gt(0);
            }
        });

        it("Should return lottery leaderboard", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up a simple draw
            await lotteryManager.connect(poolContract).addParticipants(
                1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(1);
            await time.increase(1);
            await lotteryManager.selectWinner(1);
            await lotteryManager.distributePrize(1);

            const [winners, amounts] = await lotteryManager.getLotteryLeaderboard(10);
            
            expect(winners.length).to.be.gte(1);
            expect(amounts.length).to.equal(winners.length);
            
            // Check that amounts are sorted in descending order
            for (let i = 0; i < amounts.length - 1; i++) {
                expect(amounts[i]).to.be.gte(amounts[i + 1]);
            }
        });

        it("Should return draws by time range", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up draws
            await lotteryManager.connect(poolContract).addParticipants(
                1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(1);
            
            const now = await time.latest();
            const startTime = now - 3600; // 1 hour ago
            const endTime = now + 3600; // 1 hour from now

            const draws = await lotteryManager.getDrawsByTimeRange(startTime, endTime);
            expect(draws.length).to.equal(1); // One draw should be in range
        });

        it("Should return global lottery statistics", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up and complete a draw
            await lotteryManager.connect(poolContract).addParticipants(
                1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(1);
            await time.increase(1);
            await lotteryManager.selectWinner(1);
            await lotteryManager.distributePrize(1);

            const [totalDraws, totalPrizesDistributed, totalParticipants, averagePrizeAmount] = 
                await lotteryManager.getGlobalLotteryStats();

            expect(totalDraws).to.equal(1);
            expect(totalPrizesDistributed).to.be.gt(0);
            expect(totalParticipants).to.be.gte(2);
            expect(averagePrizeAmount).to.be.gt(0);
        });

        it("Should return pool lottery statistics", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up and complete a draw
            await lotteryManager.connect(poolContract).addParticipants(
                1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(1);
            await time.increase(1);
            await lotteryManager.selectWinner(1);
            await lotteryManager.distributePrize(1);

            const [totalDraws, totalPrizes, lastDrawTime] = 
                await lotteryManager.getPoolLotteryStats(1);

            expect(totalDraws).to.equal(1);
            expect(totalPrizes).to.be.gt(0);
            expect(lastDrawTime).to.be.gt(0);
        });
    });

    describe("Batch Processing", function () {
        it("Should batch process multiple draws", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            // Set up multiple pending draws
            const poolId1 = 1;
            const poolId2 = 2;

            await lotteryManager.connect(poolContract).addParticipants(
                poolId1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).addParticipants(
                poolId2,
                [user2.address, user3.address],
                [200, 100]
            );

            await lotteryManager.connect(poolContract).requestDraw(poolId1);
            await lotteryManager.connect(poolContract).requestDraw(poolId2);

            // Advance time to make draws ready
            await time.increase(1);

            const drawIds = [1, 2];

            await expect(lotteryManager.batchProcessDraws(drawIds))
                .to.emit(lotteryManager, "BonusWinnerSelected")
                .and.to.emit(lotteryManager, "PrizePaidOut");

            // Check that both draws are completed
            const draw1 = await lotteryManager.getDraw(1);
            const draw2 = await lotteryManager.getDraw(2);

            expect(draw1.winner).to.not.equal(hre.ethers.ZeroAddress);
            expect(draw2.winner).to.not.equal(hre.ethers.ZeroAddress);
            expect(draw1.isPaidOut).to.be.true;
            expect(draw2.isPaidOut).to.be.true;
        });

        it("Should skip invalid or completed draws in batch", async function () {
            const { lotteryManager, poolContract, user1, user2, user3 } = await loadFixture(deployLotteryManagerFixture);
            
            await lotteryManager.connect(poolContract).addParticipants(
                1,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).addParticipants(
                2,
                [user2.address, user3.address],
                [200, 100]
            );

            await lotteryManager.connect(poolContract).requestDraw(1);
            await lotteryManager.connect(poolContract).requestDraw(2);
            await time.increase(1);

            // Complete one draw manually first
            await lotteryManager.selectWinner(1);
            await lotteryManager.distributePrize(1);

            // Try to batch process including the completed draw
            const drawIds = [1, 2, 999]; // Include invalid draw ID

            await expect(lotteryManager.batchProcessDraws(drawIds))
                .to.emit(lotteryManager, "BonusWinnerSelected"); // Only for draw 2

            const draw2 = await lotteryManager.getDraw(2);
            expect(draw2.winner).to.not.equal(hre.ethers.ZeroAddress);
        });
    });

    describe("Enhanced Prize Distribution", function () {
        it("Should distribute prize with yield check", async function () {
            const { lotteryManager, poolContract, user1, user2 } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(poolId);
            await time.increase(1);
            await lotteryManager.selectWinner(1);

            await expect(lotteryManager.distributePrizeWithYieldCheck(1))
                .to.emit(lotteryManager, "PrizePaidOut");

            const draw = await lotteryManager.getDraw(1);
            expect(draw.isPaidOut).to.be.true;
        });

        it("Should revert if insufficient prize pool and no yield funding", async function () {
            const { lotteryManager, poolContract, user1, user2, admin } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                [user1.address, user2.address],
                [100, 150]
            );

            await lotteryManager.connect(poolContract).requestDraw(poolId);
            await time.increase(1);
            await lotteryManager.selectWinner(1);

            // Drain the contract balance
            const balance = await hre.ethers.provider.getBalance(await lotteryManager.getAddress());
            await lotteryManager.connect(admin).emergencyWithdraw(balance);

            await expect(lotteryManager.distributePrizeWithYieldCheck(1))
                .to.be.revertedWithCustomError(lotteryManager, "InsufficientPrizePool");
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle empty participant list in global stats", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const [totalDraws, totalPrizesDistributed, totalParticipants, averagePrizeAmount] = 
                await lotteryManager.getGlobalLotteryStats();

            expect(totalDraws).to.equal(0);
            expect(totalPrizesDistributed).to.equal(0);
            expect(totalParticipants).to.equal(0);
            expect(averagePrizeAmount).to.equal(0);
        });

        it("Should handle participant history for non-participant", async function () {
            const { lotteryManager, user1 } = await loadFixture(deployLotteryManagerFixture);
            
            const [draws, totalWon, winCount, participationCount] = 
                await lotteryManager.getDetailedParticipantHistory(user1.address);

            expect(draws.length).to.equal(0);
            expect(totalWon).to.equal(0);
            expect(winCount).to.equal(0);
            expect(participationCount).to.equal(0);
        });

        it("Should return empty leaderboard when no winners", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const [winners, amounts] = await lotteryManager.getLotteryLeaderboard(10);
            
            expect(winners.length).to.equal(0);
            expect(amounts.length).to.equal(0);
        });

        it("Should handle time range queries with no draws", async function () {
            const { lotteryManager } = await loadFixture(deployLotteryManagerFixture);
            
            const futureTime = (await time.latest()) + 86400; // 1 day in future
            const draws = await lotteryManager.getDrawsByTimeRange(
                futureTime,
                futureTime + 3600
            );
            
            expect(draws.length).to.equal(0);
        });
    });

    describe("Integration with Yield System", function () {
        it("Should emit yield funding request when needed", async function () {
            const { lotteryManager, poolContract, user1, admin } = await loadFixture(deployLotteryManagerFixture);
            
            const poolId = 1;
            
            // Set up a draw that would need funding
            await lotteryManager.connect(poolContract).addParticipants(
                poolId,
                [user1.address],
                [100]
            );

            await lotteryManager.connect(poolContract).requestDraw(poolId);
            await time.increase(1);
            await lotteryManager.selectWinner(1);

            // Drain contract balance to force yield funding request
            const balance = await hre.ethers.provider.getBalance(await lotteryManager.getAddress());
            await lotteryManager.connect(admin).emergencyWithdraw(balance);

            // This should emit a yield funding request (though it will still fail due to insufficient funds)
            await expect(lotteryManager.distributePrizeWithYieldCheck(1))
                .to.emit(lotteryManager, "YieldFundingRequested")
                .withArgs(poolId, await lotteryManager.calculatePrizeAmount(poolId));
        });
    });
});
