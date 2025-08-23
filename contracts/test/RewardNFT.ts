import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { RewardNFT } from "../typechain-types";

// Add chai matchers for hardhat
import "@nomicfoundation/hardhat-chai-matchers";

describe("RewardNFT Badge System", function () {
    let rewardNFT: RewardNFT;
    let owner: HardhatEthersSigner;
    let admin: HardhatEthersSigner;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let user3: HardhatEthersSigner;
    let poolContract: HardhatEthersSigner;

    const BADGE_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BADGE_MINTER_ROLE"));
    const BADGE_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BADGE_ADMIN_ROLE"));

    enum BadgeType {
        PoolCreator = 0,
        EarlyJoiner = 1,
        LotteryWinner = 2,
        PoolCompleter = 3,
        HighYielder = 4,
        Veteran = 5,
        SocialInfluencer = 6,
        TrustBuilder = 7
    }

    enum BadgeRarity {
        Common = 0,
        Uncommon = 1,
        Rare = 2,
        Epic = 3,
        Legendary = 4
    }

    beforeEach(async function () {
        [owner, admin, user1, user2, user3, poolContract] = await ethers.getSigners();

        // Deploy RewardNFT contract
        const RewardNFTFactory = await ethers.getContractFactory("RewardNFT");
        rewardNFT = await RewardNFTFactory.deploy(
            admin.address,
            "Arisan+ Badges",
            "BADGE"
        );
        await rewardNFT.waitForDeployment();

        // Grant minter role to pool contract for testing
        await rewardNFT.connect(admin).grantRole(BADGE_MINTER_ROLE, poolContract.address);
    });

    describe("Deployment", function () {
        it("Should set correct name and symbol", async function () {
            expect(await rewardNFT.name()).to.equal("Arisan+ Badges");
            expect(await rewardNFT.symbol()).to.equal("BADGE");
        });

        it("Should assign admin roles correctly", async function () {
            expect(await rewardNFT.hasRole(await rewardNFT.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
            expect(await rewardNFT.hasRole(BADGE_ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("Should initialize with correct next token ID", async function () {
            expect(await rewardNFT.getNextTokenId()).to.equal(1);
        });
    });

    describe("Badge Templates", function () {
        it("Should have initialized default badge templates", async function () {
            const poolCreatorTemplate = await rewardNFT.getBadgeTemplate(BadgeType.PoolCreator);
            expect(poolCreatorTemplate.title).to.equal("Pool Creator");
            expect(poolCreatorTemplate.rarity).to.equal(BadgeRarity.Uncommon);
            expect(poolCreatorTemplate.isActive).to.be.true;
            expect(poolCreatorTemplate.minValue).to.equal(1);
        });

        it("Should allow admin to update badge templates", async function () {
            const newTemplate = {
                badgeType: BadgeType.PoolCreator,
                rarity: BadgeRarity.Rare,
                title: "Updated Pool Creator",
                description: "Updated description",
                imageURI: "https://updated.uri",
                minValue: 2,
                isActive: true,
                totalMinted: 0,
                maxSupply: 100
            };

            await expect(rewardNFT.connect(admin).updateBadgeTemplate(BadgeType.PoolCreator, newTemplate))
                .to.emit(rewardNFT, "BadgeTemplateUpdated")
                .withArgs(BadgeType.PoolCreator, [
                    newTemplate.badgeType,
                    newTemplate.rarity,
                    newTemplate.title,
                    newTemplate.description,
                    newTemplate.imageURI,
                    newTemplate.minValue,
                    newTemplate.isActive,
                    newTemplate.totalMinted,
                    newTemplate.maxSupply
                ]);

            const updatedTemplate = await rewardNFT.getBadgeTemplate(BadgeType.PoolCreator);
            expect(updatedTemplate.title).to.equal("Updated Pool Creator");
            expect(updatedTemplate.rarity).to.equal(BadgeRarity.Rare);
        });

        it("Should not allow non-admin to update templates", async function () {
            const newTemplate = {
                badgeType: BadgeType.PoolCreator,
                rarity: BadgeRarity.Rare,
                title: "Updated Pool Creator",
                description: "Updated description",
                imageURI: "https://updated.uri",
                minValue: 2,
                isActive: true,
                totalMinted: 0,
                maxSupply: 100
            };

            await expect(rewardNFT.connect(user1).updateBadgeTemplate(BadgeType.PoolCreator, newTemplate))
                .to.be.revertedWithCustomError(rewardNFT, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Badge Minting", function () {
        it("Should mint badge successfully for authorized minter", async function () {
            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            ))
                .to.emit(rewardNFT, "BadgeMinted")
                .withArgs(user1.address, 1, BadgeType.PoolCreator, BadgeRarity.Uncommon, 1);

            expect(await rewardNFT.ownerOf(1)).to.equal(user1.address);
            expect(await rewardNFT.balanceOf(user1.address)).to.equal(1);
        });

        it("Should not allow unauthorized address to mint badges", async function () {
            await expect(rewardNFT.connect(user1).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "AccessControlUnauthorizedAccount");
        });

        it("Should not mint badge below minimum value", async function () {
            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.HighYielder,
                1,
                ethers.parseEther("0.5"), // Less than 1 ETH minimum
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "InsufficientValue");
        });

        it("Should track badge information correctly", async function () {
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.EarlyJoiner,
                123,
                5,
                ethers.toUtf8Bytes("early joiner data")
            );

            const badgeInfo = await rewardNFT.getBadgeInfo(1);
            expect(badgeInfo.tokenId).to.equal(1);
            expect(badgeInfo.badgeType).to.equal(BadgeType.EarlyJoiner);
            expect(badgeInfo.recipient).to.equal(user1.address);
            expect(badgeInfo.poolId).to.equal(123);
            expect(badgeInfo.value).to.equal(5);
            expect(badgeInfo.title).to.equal("Early Joiner");
        });

        it("Should update user statistics correctly", async function () {
            // Mint common badge
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.EarlyJoiner,
                1,
                1,
                "0x"
            );

            // Mint uncommon badge
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            const stats = await rewardNFT.getUserBadgeStats(user1.address);
            expect(stats.totalBadges).to.equal(2);
            expect(stats.commonCount).to.equal(1);
            expect(stats.uncommonCount).to.equal(1);
            expect(stats.reputationScore).to.equal(4); // 1*1 + 1*3
        });

        it("Should prevent duplicate unique badge types", async function () {
            // Mint first Pool Creator badge
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            // Try to mint another Pool Creator badge (should fail)
            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                2,
                1,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "BadgeAlreadyOwned");
        });

        it("Should respect max supply limits", async function () {
            // Update Trust Builder template to have max supply of 1
            const template = await rewardNFT.getBadgeTemplate(BadgeType.TrustBuilder);
            const updatedTemplate = {
                badgeType: template.badgeType,
                rarity: template.rarity,
                title: template.title,
                description: template.description,
                imageURI: template.imageURI,
                minValue: template.minValue,
                isActive: template.isActive,
                totalMinted: template.totalMinted,
                maxSupply: 1
            };
            await rewardNFT.connect(admin).updateBadgeTemplate(BadgeType.TrustBuilder, updatedTemplate);

            // Mint first badge
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.TrustBuilder,
                1,
                5,
                "0x"
            );

            // Try to mint second badge (should fail)
            await expect(rewardNFT.connect(poolContract).mintBadge(
                user2.address,
                BadgeType.TrustBuilder,
                1,
                5,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "MaxSupplyReached");
        });
    });

    describe("Batch Minting", function () {
        it("Should batch mint multiple badges", async function () {
            const badgeTypes = [BadgeType.EarlyJoiner, BadgeType.PoolCompleter];
            const poolIds = [1, 1];
            const values = [1, 1];

            const tokenIds = await rewardNFT.connect(poolContract).batchMintBadges.staticCall(
                user1.address,
                badgeTypes,
                poolIds,
                values
            );

            await rewardNFT.connect(poolContract).batchMintBadges(
                user1.address,
                badgeTypes,
                poolIds,
                values
            );

            expect(tokenIds.length).to.equal(2);
            expect(await rewardNFT.balanceOf(user1.address)).to.equal(2);
        });

        it("Should fail batch mint with mismatched array lengths", async function () {
            const badgeTypes = [BadgeType.EarlyJoiner, BadgeType.PoolCompleter];
            const poolIds = [1]; // Different length
            const values = [1, 1];

            await expect(rewardNFT.connect(poolContract).batchMintBadges(
                user1.address,
                badgeTypes,
                poolIds,
                values
            ))
                .to.be.revertedWithCustomError(rewardNFT, "InvalidArrayLength");
        });
    });

    describe("Badge Queries", function () {
        beforeEach(async function () {
            // Mint some test badges
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.EarlyJoiner,
                2,
                1,
                "0x"
            );
            await rewardNFT.connect(poolContract).mintBadge(
                user2.address,
                BadgeType.LotteryWinner,
                1,
                1,
                "0x"
            );
        });

        it("Should return user badges correctly", async function () {
            const userBadges = await rewardNFT.getUserBadges(user1.address);
            expect(userBadges.length).to.equal(2);
            expect(userBadges[0].badgeType).to.equal(BadgeType.PoolCreator);
            expect(userBadges[1].badgeType).to.equal(BadgeType.EarlyJoiner);
        });

        it("Should return badges by type", async function () {
            const poolCreatorBadges = await rewardNFT.getBadgesByType(BadgeType.PoolCreator);
            expect(poolCreatorBadges.length).to.equal(1);
            expect(poolCreatorBadges[0].recipient).to.equal(user1.address);
        });

        it("Should return badges by rarity", async function () {
            const commonBadges = await rewardNFT.getBadgesByRarity(BadgeRarity.Common);
            expect(commonBadges.length).to.equal(1);
            expect(commonBadges[0].badgeType).to.equal(BadgeType.EarlyJoiner);

            const rareBadges = await rewardNFT.getBadgesByRarity(BadgeRarity.Rare);
            expect(rareBadges.length).to.equal(1);
            expect(rareBadges[0].badgeType).to.equal(BadgeType.LotteryWinner);
        });

        it("Should return pool badges correctly", async function () {
            const pool1Badges = await rewardNFT.getPoolBadges(1);
            expect(pool1Badges.length).to.equal(2); // PoolCreator and LotteryWinner

            const pool2Badges = await rewardNFT.getPoolBadges(2);
            expect(pool2Badges.length).to.equal(1); // EarlyJoiner
        });

        it("Should check badge ownership correctly", async function () {
            expect(await rewardNFT.ownsBadgeType(user1.address, BadgeType.PoolCreator)).to.be.true;
            expect(await rewardNFT.ownsBadgeType(user1.address, BadgeType.LotteryWinner)).to.be.false;
            expect(await rewardNFT.ownsBadgeType(user2.address, BadgeType.LotteryWinner)).to.be.true;
        });

        it("Should return correct badge type supply", async function () {
            expect(await rewardNFT.getBadgeTypeSupply(BadgeType.PoolCreator)).to.equal(1);
            expect(await rewardNFT.getBadgeTypeSupply(BadgeType.EarlyJoiner)).to.equal(1);
            expect(await rewardNFT.getBadgeTypeSupply(BadgeType.Veteran)).to.equal(0);
        });
    });

    describe("Eligibility Checks", function () {
        it("Should check eligibility correctly", async function () {
            expect(await rewardNFT.isEligibleForBadge(
                user1.address,
                BadgeType.EarlyJoiner,
                1
            )).to.be.true;

            expect(await rewardNFT.isEligibleForBadge(
                user1.address,
                BadgeType.HighYielder,
                ethers.parseEther("0.5")
            )).to.be.false; // Below minimum value

            expect(await rewardNFT.canMintBadge(BadgeType.PoolCreator)).to.be.true;
        });

        it("Should check eligibility with existing unique badges", async function () {
            // Mint a unique badge
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            // Should not be eligible for another of the same type
            expect(await rewardNFT.isEligibleForBadge(
                user1.address,
                BadgeType.PoolCreator,
                1
            )).to.be.false;
        });
    });

    describe("Reputation System", function () {
        it("Should calculate reputation score correctly", async function () {
            // Mint badges of different rarities
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.EarlyJoiner, // Common = 1 point
                1,
                1,
                "0x"
            );
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator, // Uncommon = 3 points
                1,
                1,
                "0x"
            );

            const reputationScore = await rewardNFT.calculateReputationScore(user1.address);
            expect(reputationScore).to.equal(4); // 1 + 3
        });

        it("Should return correct rarity multipliers", async function () {
            expect(await rewardNFT.getRarityMultiplier(BadgeRarity.Common)).to.equal(1);
            expect(await rewardNFT.getRarityMultiplier(BadgeRarity.Uncommon)).to.equal(3);
            expect(await rewardNFT.getRarityMultiplier(BadgeRarity.Rare)).to.equal(10);
            expect(await rewardNFT.getRarityMultiplier(BadgeRarity.Epic)).to.equal(30);
            expect(await rewardNFT.getRarityMultiplier(BadgeRarity.Legendary)).to.equal(100);
        });

        it("Should emit reputation update events", async function () {
            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.TrustBuilder, // Legendary = 100 points
                1,
                5,
                "0x"
            ))
                .to.emit(rewardNFT, "ReputationUpdated")
                .withArgs(user1.address, 100, 1);
        });
    });

    describe("Metadata Management", function () {
        it("Should allow admin to update badge metadata", async function () {
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            const newImageURI = "https://new-image.uri";
            await expect(rewardNFT.connect(admin).updateBadgeMetadata(1, newImageURI))
                .to.emit(rewardNFT, "BadgeMetadataUpdated")
                .withArgs(1, newImageURI);

            const badgeInfo = await rewardNFT.getBadgeInfo(1);
            expect(badgeInfo.imageURI).to.equal(newImageURI);
        });

        it("Should allow token owner to update metadata", async function () {
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            const newImageURI = "https://owner-updated.uri";
            await rewardNFT.connect(user1).updateBadgeMetadata(1, newImageURI);

            const badgeInfo = await rewardNFT.getBadgeInfo(1);
            expect(badgeInfo.imageURI).to.equal(newImageURI);
        });

        it("Should not allow unauthorized users to update metadata", async function () {
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            await expect(rewardNFT.connect(user2).updateBadgeMetadata(1, "https://unauthorized.uri"))
                .to.be.revertedWithCustomError(rewardNFT, "UnauthorizedMinter");
        });
    });

    describe("Emergency Controls", function () {
        it("Should allow admin to pause and unpause", async function () {
            await rewardNFT.connect(admin).emergencyPause();
            expect(await rewardNFT.paused()).to.be.true;

            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "EnforcedPause");

            await rewardNFT.connect(admin).emergencyUnpause();
            expect(await rewardNFT.paused()).to.be.false;

            // Should work again
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );
        });

        it("Should not allow non-admin to pause", async function () {
            await expect(rewardNFT.connect(user1).emergencyPause())
                .to.be.revertedWithCustomError(rewardNFT, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Error Cases", function () {
        it("Should revert on non-existent token queries", async function () {
            await expect(rewardNFT.getBadgeInfo(999))
                .to.be.revertedWithCustomError(rewardNFT, "BadgeNotFound");
        });

        it("Should revert on inactive badge minting", async function () {
            // Deactivate a badge type
            const template = await rewardNFT.getBadgeTemplate(BadgeType.PoolCreator);
            const updatedTemplate = {
                badgeType: template.badgeType,
                rarity: template.rarity,
                title: template.title,
                description: template.description,
                imageURI: template.imageURI,
                minValue: template.minValue,
                isActive: false,
                totalMinted: template.totalMinted,
                maxSupply: template.maxSupply
            };
            await rewardNFT.connect(admin).updateBadgeTemplate(BadgeType.PoolCreator, updatedTemplate);

            await expect(rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "BadgeNotActive");
        });

        it("Should revert on zero address recipient", async function () {
            await expect(rewardNFT.connect(poolContract).mintBadge(
                ethers.ZeroAddress,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            ))
                .to.be.revertedWithCustomError(rewardNFT, "InvalidBadgeType");
        });
    });

    describe("Integration Scenarios", function () {
        it("Should handle complete user journey", async function () {
            // User creates pool (gets PoolCreator badge)
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );

            // User joins early (gets EarlyJoiner badge)
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.EarlyJoiner,
                1,
                1,
                "0x"
            );

            // User wins lottery (gets LotteryWinner badge)
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.LotteryWinner,
                1,
                1,
                "0x"
            );

            // User completes pool (gets PoolCompleter badge)
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCompleter,
                1,
                1,
                "0x"
            );

            const userBadges = await rewardNFT.getUserBadges(user1.address);
            expect(userBadges.length).to.equal(4);

            const stats = await rewardNFT.getUserBadgeStats(user1.address);
            expect(stats.totalBadges).to.equal(4);
            expect(stats.reputationScore).to.equal(15); // 3+1+10+1

            const reputationScore = await rewardNFT.calculateReputationScore(user1.address);
            expect(reputationScore).to.equal(15);
        });

        it("Should handle multiple users with different achievements", async function () {
            // User 1: Pool creator and completer
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCreator,
                1,
                1,
                "0x"
            );
            await rewardNFT.connect(poolContract).mintBadge(
                user1.address,
                BadgeType.PoolCompleter,
                1,
                1,
                "0x"
            );

            // User 2: Lottery winner and high yielder
            await rewardNFT.connect(poolContract).mintBadge(
                user2.address,
                BadgeType.LotteryWinner,
                1,
                1,
                "0x"
            );
            await rewardNFT.connect(poolContract).mintBadge(
                user2.address,
                BadgeType.HighYielder,
                1,
                ethers.parseEther("2"),
                "0x"
            );

            // User 3: Social influencer
            await rewardNFT.connect(poolContract).mintBadge(
                user3.address,
                BadgeType.SocialInfluencer,
                0,
                5,
                "0x"
            );

            // Check individual scores
            const user1Score = await rewardNFT.calculateReputationScore(user1.address);
            const user2Score = await rewardNFT.calculateReputationScore(user2.address);
            const user3Score = await rewardNFT.calculateReputationScore(user3.address);

            expect(user1Score).to.equal(4); // 3 + 1
            expect(user2Score).to.equal(40); // 10 + 30
            expect(user3Score).to.equal(10); // 10

            // Check badge type distributions
            const lotteryWinnerBadges = await rewardNFT.getBadgesByType(BadgeType.LotteryWinner);
            expect(lotteryWinnerBadges.length).to.equal(1);

            const rareBadges = await rewardNFT.getBadgesByRarity(BadgeRarity.Rare);
            expect(rareBadges.length).to.equal(2); // LotteryWinner and SocialInfluencer
        });
    });

    describe("Gas Optimization", function () {
        it("Should efficiently handle batch operations", async function () {
            const badgeTypes = [
                BadgeType.EarlyJoiner,
                BadgeType.PoolCompleter,
                BadgeType.LotteryWinner
            ];
            const poolIds = [1, 1, 1];
            const values = [1, 1, 1];

            // Batch mint should be more efficient than individual mints
            const tx = await rewardNFT.connect(poolContract).batchMintBadges(
                user1.address,
                badgeTypes,
                poolIds,
                values
            );

            const receipt = await tx.wait();
            expect(receipt?.gasUsed).to.be.lessThan(3000000); // More reasonable gas limit for batch operations
        });
    });
});
