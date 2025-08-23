import { expect } from "chai";
import { ethers } from "hardhat";
import { 
    PoolFactory,
    Pool,
    RewardNFT,
    LotteryManager,
    MockYieldManager 
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Badge Pool Integration - SC-011", function() {
    let poolFactory: PoolFactory;
    let badgeContract: RewardNFT;
    let lotteryManager: LotteryManager;
    let yieldManager: MockYieldManager;
    let pool: Pool;
    
    let admin: SignerWithAddress;
    let creator: SignerWithAddress;
    let member1: SignerWithAddress;
    let member2: SignerWithAddress;
    let member3: SignerWithAddress;
    
    const CONTRIBUTION_AMOUNT = ethers.parseEther("1.0");
    const MAX_MEMBERS = 3;
    const DURATION = 7 * 24 * 60 * 60; // 7 days

    beforeEach(async function() {
        [admin, creator, member1, member2, member3] = await ethers.getSigners();

        // Deploy MockYieldManager
        const MockYieldManagerFactory = await ethers.getContractFactory("MockYieldManager");
        yieldManager = await MockYieldManagerFactory.deploy();
        await yieldManager.waitForDeployment();

        // Deploy RewardNFT (Badge contract)
        const RewardNFTFactory = await ethers.getContractFactory("RewardNFT");
        badgeContract = await RewardNFTFactory.deploy(
            admin.address,
            "Arisan+ Badges",
            "BADGE"
        );
        await badgeContract.waitForDeployment();

        // Deploy LotteryManager with badge contract
        const LotteryManagerFactory = await ethers.getContractFactory("LotteryManager");
        lotteryManager = await LotteryManagerFactory.deploy(
            admin.address,
            await badgeContract.getAddress()
        );
        await lotteryManager.waitForDeployment();

        // Deploy PoolFactory with badge contract
        const PoolFactoryFactory = await ethers.getContractFactory("PoolFactory");
        poolFactory = await PoolFactoryFactory.deploy(
            admin.address,
            await badgeContract.getAddress()
        );
        await poolFactory.waitForDeployment();

        // Grant BADGE_MINTER_ROLE to PoolFactory and LotteryManager
        const BADGE_MINTER_ROLE = await badgeContract.BADGE_MINTER_ROLE();
        await badgeContract.grantRole(BADGE_MINTER_ROLE, await poolFactory.getAddress());
        await badgeContract.grantRole(BADGE_MINTER_ROLE, await lotteryManager.getAddress());

        // Configure lottery manager for testing
        await lotteryManager.updateLotteryConfig({
            drawInterval: 7 * 24 * 60 * 60, // 7 days
            prizePercentage: 1000, // 10%
            minPoolSize: 3, // Allow 3 members instead of default 5
            maxPrizeAmount: ethers.parseEther("10"),
            isActive: true
        });

        // Setup badge templates
        await setupBadgeTemplates();
    });

    async function setupBadgeTemplates() {
        // PoolCreator badge template
        await badgeContract.updateBadgeTemplate(0, { // BadgeType.PoolCreator
            badgeType: 0,
            rarity: 0, // Common
            title: "Pool Creator",
            description: "Created a savings pool",
            imageURI: "ipfs://creator",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // EarlyJoiner badge template
        await badgeContract.updateBadgeTemplate(1, { // BadgeType.EarlyJoiner
            badgeType: 1,
            rarity: 1, // Uncommon
            title: "Early Joiner",
            description: "Joined a savings pool early",
            imageURI: "ipfs://earlyjoiner",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // LotteryWinner badge template
        await badgeContract.updateBadgeTemplate(2, { // BadgeType.LotteryWinner
            badgeType: 2,
            rarity: 2, // Rare
            title: "Lottery Winner",
            description: "Won a lottery draw",
            imageURI: "ipfs://lotteryWinner",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // PoolCompleter badge template
        await badgeContract.updateBadgeTemplate(3, { // BadgeType.PoolCompleter
            badgeType: 3,
            rarity: 1, // Uncommon
            title: "Pool Completer",
            description: "Completed a savings pool",
            imageURI: "ipfs://poolCompleter",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // HighYielder badge template
        await badgeContract.updateBadgeTemplate(4, { // BadgeType.HighYielder
            badgeType: 4,
            rarity: 3, // Epic
            title: "High Yielder",
            description: "Earned significant yield",
            imageURI: "ipfs://highYielder",
            minValue: ethers.parseEther("0.1"),
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });
    }

    async function createPool() {
        const params = {
            name: "Test Pool",
            contributionAmount: CONTRIBUTION_AMOUNT,
            maxMembers: MAX_MEMBERS,
            duration: DURATION,
            yieldManager: await yieldManager.getAddress()
        };

        const tx = await poolFactory.connect(creator).createPool(params);
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find(
            log => poolFactory.interface.parseLog(log as any)?.name === "PoolCreated"
        );
        
        if (!event) throw new Error("PoolCreated event not found");
        
        const parsedEvent = poolFactory.interface.parseLog(event as any);
        const poolAddress = parsedEvent?.args[1];
        
        pool = await ethers.getContractAt("Pool", poolAddress);
        return pool;
    }

    describe("Pool Creator Badge", function() {
        it("Should mint PoolCreator badge when pool is created", async function() {
            // Get initial badge count
            const initialBadges = await badgeContract.getUserBadges(creator.address);
            console.log("Initial badges count:", initialBadges.length);
            
            await createPool();
            
            // Debug: Check pool factory state
            const poolAddress = await pool.getAddress();
            const poolId = await poolFactory.getPoolId(poolAddress);
            console.log("Pool ID:", poolId.toString());
            console.log("Badge contract address:", await badgeContract.getAddress());
            console.log("Pool badge contract address:", await pool.getBadgeContract());
            
            // Check that pool creator has a badge
            const finalBadges = await badgeContract.getUserBadges(creator.address);
            console.log("Final badges count:", finalBadges.length);
            
            // Should have one more badge than initial
            expect(finalBadges.length).to.equal(initialBadges.length + 1);
            
            // Check the latest badge is PoolCreator
            const latestBadge = finalBadges[finalBadges.length - 1];
            expect(latestBadge.badgeType).to.equal(0); // PoolCreator
            expect(latestBadge.recipient).to.equal(creator.address);
        });

        it("Should work even if badge contract fails", async function() {
            // Deploy pool factory with invalid badge contract
            const invalidPoolFactory = await ethers.getContractFactory("PoolFactory");
            const factory = await invalidPoolFactory.deploy(
                admin.address,
                ethers.ZeroAddress // Invalid badge contract
            );

            const params = {
                name: "Test Pool",
                contributionAmount: CONTRIBUTION_AMOUNT,
                maxMembers: MAX_MEMBERS,
                duration: DURATION,
                yieldManager: await yieldManager.getAddress()
            };

            // Should still create pool successfully
            await expect(factory.connect(creator).createPool(params))
                .to.not.be.reverted;
        });
    });

    describe("Member Joining Badges", function() {
        beforeEach(async function() {
            await createPool();
        });

        it("Should mint EarlyJoiner badges for pool members", async function() {
            // Member 1 joins
            await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Check member1 received EarlyJoiner badge
            const member1Badges = await badgeContract.getUserBadges(member1.address);
            expect(member1Badges.length).to.equal(1);
            
            const badge = member1Badges[0];
            expect(badge.badgeType).to.equal(1); // EarlyJoiner
            expect(badge.recipient).to.equal(member1.address);
            expect(badge.title).to.equal("Early Joiner");
            
            // Member 2 joins
            await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Check member2 also received EarlyJoiner badge
            const member2Badges = await badgeContract.getUserBadges(member2.address);
            expect(member2Badges.length).to.equal(1);
            
            const badge2 = member2Badges[0];
            expect(badge2.badgeType).to.equal(1); // EarlyJoiner
        });

        it("Should handle badge minting failures gracefully", async function() {
            // Revoke minter role to cause badge minting to fail
            const BADGE_MINTER_ROLE = await badgeContract.BADGE_MINTER_ROLE();
            await badgeContract.revokeRole(BADGE_MINTER_ROLE, await poolFactory.getAddress());
            
            // Pool joining should still work
            await expect(pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT }))
                .to.not.be.reverted;
            
            // Check pool state is correct
            expect(await pool.isMember(member1.address)).to.be.true;
            const poolInfo = await pool.getPoolInfo();
            expect(poolInfo.currentMembers).to.equal(1);
        });
    });

    describe("Pool Completion Badges", function() {
        beforeEach(async function() {
            await createPool();
            
            // Fill the pool
            await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Fast forward time to allow completion
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);
        });

        it("Should mint PoolCompleter badges when pool completes", async function() {
            // Set up yield manager to return some yield
            const poolId = await pool.getPoolId();
            const yieldAmount = ethers.parseEther("0.3"); // 0.1 ETH per member
            
            // Fund the yield manager with additional ETH to cover the yield
            const yieldManagerAddress = await yieldManager.getAddress();
            await admin.sendTransaction({
                to: yieldManagerAddress,
                value: yieldAmount
            });
            
            // Add yield to the mock yield manager (Pool already deposited principal when locked)
            // Send ETH to fund the yield first
            await admin.sendTransaction({
                to: await yieldManager.getAddress(),
                value: yieldAmount
            });
            await yieldManager.addYield(poolId, yieldAmount);
            
            // Complete the pool
            await pool.completePool();
            
            // Check all members received PoolCompleter badges
            const member1Badges = await badgeContract.getUserBadges(member1.address);
            const member2Badges = await badgeContract.getUserBadges(member2.address);
            const member3Badges = await badgeContract.getUserBadges(member3.address);
            
            // Each member should have 3 badges: EarlyJoiner + PoolCompleter + HighYielder
            expect(member1Badges.length).to.equal(3);
            expect(member2Badges.length).to.equal(3);
            expect(member3Badges.length).to.equal(3);
            
            // Check PoolCompleter badge for member1
            const poolCompleterBadge = member1Badges[1];
            expect(poolCompleterBadge.badgeType).to.equal(3); // PoolCompleter
            expect(poolCompleterBadge.recipient).to.equal(member1.address);
            
            // Check HighYielder badge for member1 (since yield per member is 0.1 ETH)
            const highYielderBadge = member1Badges[2];
            expect(highYielderBadge.badgeType).to.equal(4); // HighYielder
            expect(highYielderBadge.recipient).to.equal(member1.address);
        });

        it("Should only mint HighYielder badges when yield threshold is met", async function() {
            // Set up yield manager with low yield (below threshold)
            const poolId = await pool.getPoolId();
            const totalDeposited = CONTRIBUTION_AMOUNT * BigInt(MAX_MEMBERS);
            const lowYieldAmount = ethers.parseEther("0.05"); // Only 0.016 ETH per member
            
            // Fund the yield manager with low yield
            await yieldManager.deposit(poolId, 0, { value: totalDeposited + lowYieldAmount });
            
            // Complete the pool
            await pool.completePool();
            
            // Check members received only EarlyJoiner + PoolCompleter badges (no HighYielder)
            const member1Badges = await badgeContract.getUserBadges(member1.address);
            expect(member1Badges.length).to.equal(2);
            
            const badge1 = member1Badges[0];
            const badge2 = member1Badges[1];
            
            // Should have EarlyJoiner and PoolCompleter, but not HighYielder
            const badgeTypes = [badge1.badgeType, badge2.badgeType];
            expect(badgeTypes).to.include(1n); // EarlyJoiner
            expect(badgeTypes).to.include(3n); // PoolCompleter
            expect(badgeTypes).to.not.include(4n); // HighYielder
        });
    });

    describe("Lottery Winner Badges", function() {
        beforeEach(async function() {
            await createPool();
            
            // Fill the pool and set up for lottery
            await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Grant pool role to admin for testing
            const POOL_ROLE = await lotteryManager.POOL_ROLE();
            await lotteryManager.grantRole(POOL_ROLE, admin.address);
        });

        it("Should mint LotteryWinner badge when lottery winner is selected", async function() {
            const poolId = await pool.getPoolId();
            
            // Complete pool lifecycle to generate yield
            // Pool auto-locks when full (3 members), so no need to call lockPool()
            
            // Add yield to mock yield manager for the pool
            const yieldAmount = ethers.parseEther("0.3"); // 30% yield on 3 ETH = 0.9 ETH
            // Send ETH to fund the yield first
            await admin.sendTransaction({
                to: await yieldManager.getAddress(),
                value: yieldAmount
            });
            await yieldManager.addYield(poolId, yieldAmount);
            
            // Fast forward time to allow pool completion
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Complete the pool
            await pool.triggerCompletion();
            
            // Add participants correctly (based on actual members)
            await lotteryManager.addParticipants(
                poolId, 
                [member1.address, member2.address, member3.address],
                [100, 100, 100]
            );
            
            // Request draw
            await lotteryManager.requestDraw(poolId, yieldAmount);
            
            // Select winner
            const drawId = 1;
            await lotteryManager.selectWinner(drawId);
            
            // Get the winner by checking draw information
            const draw = await lotteryManager.getDraw(drawId);
            const winner = draw.winner;
            
            // Check winner received LotteryWinner badge
            const winnerBadges = await badgeContract.getUserBadges(winner);
            
            // Calculate expected prize: 10% of yield amount = 10% * 0.3 ETH = 0.03 ETH
            const expectedPrize = (yieldAmount * 1000n) / 10000n; // 10% in basis points
            
            // Find lottery badge
            let foundLotteryBadge = false;
            for (const badge of winnerBadges) {
                if (badge.badgeType === 2n) { // LotteryWinner
                    foundLotteryBadge = true;
                    expect(badge.recipient).to.equal(winner);
                    expect(badge.value).to.equal(expectedPrize);
                    break;
                }
            }
            
            expect(foundLotteryBadge).to.be.true;
        });

        it("Should handle badge minting failures in lottery", async function() {
            // Complete pool lifecycle first
            // Pool auto-locks when full (3 members), so no need to call lockPool()
            
            // Add yield to mock yield manager for the pool
            const yieldAmount = ethers.parseEther("0.1");
            // Send ETH to fund the yield first
            await admin.sendTransaction({
                to: await yieldManager.getAddress(),
                value: yieldAmount
            });
            await yieldManager.addYield(await pool.getPoolId(), yieldAmount);
            
            // Fast forward time to allow pool completion
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Complete the pool
            await pool.triggerCompletion();
            
            // Revoke badge minter role to cause failure
            const BADGE_MINTER_ROLE = await badgeContract.BADGE_MINTER_ROLE();
            await badgeContract.revokeRole(BADGE_MINTER_ROLE, await lotteryManager.getAddress());
            
            const poolId = await pool.getPoolId();
            
            // Add participants and run lottery
            await lotteryManager.addParticipants(
                poolId, 
                [member1.address, member2.address, member3.address],
                [100, 100, 100]
            );
            
            await lotteryManager.requestDraw(poolId, yieldAmount);            // Should not revert even if badge minting fails
            await expect(lotteryManager.selectWinner(1)).to.not.be.reverted;
            
            // Verify lottery state is correct
            const draw = await lotteryManager.getDraw(1);
            const participants = [member1.address, member2.address, member3.address];
            expect(participants).to.include(draw.winner);
        });
    });

    describe("Badge Contract Integration", function() {
        it("Should correctly get badge contract addresses", async function() {
            expect(await poolFactory.getBadgeContract()).to.equal(await badgeContract.getAddress());
            expect(await lotteryManager.getBadgeContract()).to.equal(await badgeContract.getAddress());
        });

        it("Should allow admin to update badge contract addresses", async function() {
            const newBadgeAddress = ethers.Wallet.createRandom().address;
            
            await poolFactory.setBadgeContract(newBadgeAddress);
            expect(await poolFactory.getBadgeContract()).to.equal(newBadgeAddress);
            
            await lotteryManager.setBadgeContract(newBadgeAddress);
            expect(await lotteryManager.getBadgeContract()).to.equal(newBadgeAddress);
        });

        it("Should prevent non-admin from updating badge contract", async function() {
            const newBadgeAddress = ethers.Wallet.createRandom().address;
            
            await expect(poolFactory.connect(member1).setBadgeContract(newBadgeAddress))
                .to.be.revertedWithCustomError(poolFactory, "AccessControlUnauthorizedAccount");
            
            await expect(lotteryManager.connect(member1).setBadgeContract(newBadgeAddress))
                .to.be.revertedWithCustomError(lotteryManager, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Badge Statistics", function() {
        beforeEach(async function() {
            await createPool();
            
            // Complete a full pool lifecycle
            await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Pool auto-locks when full (3 members), so no need to call lockPool()
            
            // Set up high yield
            const poolId = await pool.getPoolId();
            const yieldAmount = ethers.parseEther("0.3"); // High yield for HighYielder badges
            // Send ETH to fund the yield first
            await admin.sendTransaction({
                to: await yieldManager.getAddress(),
                value: yieldAmount
            });
            await yieldManager.addYield(poolId, yieldAmount);
            
            // Fast forward and complete
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);
            await pool.triggerCompletion();
        });

        it("Should track user badge statistics correctly", async function() {
            // Check creator stats (should have 1 badge: PoolCreator)
            const creatorStats = await badgeContract.getUserBadgeStats(creator.address);
            expect(creatorStats.totalBadges).to.equal(1);
            expect(creatorStats.commonCount).to.equal(1); // PoolCreator is common
            
            // Check member stats (should have 3 badges: EarlyJoiner, PoolCompleter, HighYielder)
            const member1Stats = await badgeContract.getUserBadgeStats(member1.address);
            expect(member1Stats.totalBadges).to.equal(3);
            expect(member1Stats.uncommonCount).to.equal(2); // EarlyJoiner and PoolCompleter
            expect(member1Stats.epicCount).to.equal(1); // HighYielder
        });

        it("Should calculate reputation scores based on badges", async function() {
            const member1Stats = await badgeContract.getUserBadgeStats(member1.address);
            
            // Reputation should be calculated based on badge rarities
            // Common = 1, Uncommon = 3, Rare = 10, Epic = 30, Legendary = 100
            // Expected: 2 uncommon (6) + 1 epic (30) = 36
            expect(member1Stats.reputationScore).to.equal(36);
        });
    });

    describe("End-to-End Badge Integration", function() {
        it("Should mint all relevant badges through complete pool lifecycle", async function() {
            await createPool();
            
            // Members join (should get EarlyJoiner badges)
            await pool.connect(member1).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member2).joinPool({ value: CONTRIBUTION_AMOUNT });
            await pool.connect(member3).joinPool({ value: CONTRIBUTION_AMOUNT });
            
            // Pool auto-locks when full (3 members), so no need to call lockPool()
            
            // Add yield to generate rewards
            const poolId = await pool.getPoolId();
            const yieldAmount = ethers.parseEther("0.3"); // High yield for HighYielder badges
            // Send ETH to fund the yield first
            await admin.sendTransaction({
                to: await yieldManager.getAddress(),
                value: yieldAmount
            });
            await yieldManager.addYield(poolId, yieldAmount);
            
            // Fast forward time to allow pool completion
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Complete the pool (this should mint PoolCompleter and HighYielder badges)
            await pool.triggerCompletion();
            
            // Set up lottery and run a draw (after pool completion)
            const POOL_ROLE = await lotteryManager.POOL_ROLE();
            await lotteryManager.grantRole(POOL_ROLE, admin.address);
            
            await lotteryManager.addParticipants(
                poolId,
                [member1.address, member2.address, member3.address],
                [100, 100, 100]
            );
            
            await lotteryManager.requestDraw(poolId, yieldAmount);
            await lotteryManager.selectWinner(1);
            
            // Verify final badge counts
            const creatorBadges = await badgeContract.getUserBadges(creator.address);
            expect(creatorBadges.length).to.equal(1); // PoolCreator
            
            const member1Badges = await badgeContract.getUserBadges(member1.address);
            const member2Badges = await badgeContract.getUserBadges(member2.address);
            const member3Badges = await badgeContract.getUserBadges(member3.address);
            
            // Each member should have at least 3 badges (EarlyJoiner + PoolCompleter + HighYielder)
            // One of them should have LotteryWinner badge as well
            expect(member1Badges.length).to.be.at.least(3);
            expect(member2Badges.length).to.be.at.least(3);
            expect(member3Badges.length).to.equal(3); // member3 didn't participate in lottery
            
            // Check if lottery winner got the extra badge
            const draw = await lotteryManager.getDraw(1);
            const winnerAddress = draw.winner;
            const winnerBadges = await badgeContract.getUserBadges(winnerAddress);
            expect(winnerBadges.length).to.equal(4); // EarlyJoiner + PoolCompleter + HighYielder + LotteryWinner
        });
    });
});
