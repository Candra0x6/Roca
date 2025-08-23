import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("PoolFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployPoolFactoryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [admin, creator1, creator2, member1, member2, yieldManager] = await hre.ethers.getSigners();

    // Deploy PoolFactory
    const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
    const poolFactory = await PoolFactory.deploy(admin.address);

    return { poolFactory, admin, creator1, creator2, member1, member2, yieldManager };
  }

  describe("Deployment", function () {
    it("Should deploy with correct admin roles", async function () {
      const { poolFactory, admin } = await loadFixture(deployPoolFactoryFixture);

      const DEFAULT_ADMIN_ROLE = await poolFactory.DEFAULT_ADMIN_ROLE();
      const EMERGENCY_ADMIN_ROLE = await poolFactory.EMERGENCY_ADMIN_ROLE();
      const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();

      expect(await poolFactory.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await poolFactory.hasRole(EMERGENCY_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await poolFactory.hasRole(POOL_CREATOR_ROLE, admin.address)).to.be.true;
    });

    it("Should have correct constants", async function () {
      const { poolFactory } = await loadFixture(deployPoolFactoryFixture);

      expect(await poolFactory.MIN_CONTRIBUTION()).to.equal(hre.ethers.parseEther("0.01"));
      expect(await poolFactory.MAX_CONTRIBUTION()).to.equal(hre.ethers.parseEther("100"));
      expect(await poolFactory.MIN_MEMBERS()).to.equal(2);
      expect(await poolFactory.MAX_MEMBERS()).to.equal(100);
      expect(await poolFactory.MIN_DURATION()).to.equal(7 * 24 * 60 * 60); // 7 days
      expect(await poolFactory.MAX_DURATION()).to.equal(365 * 24 * 60 * 60); // 365 days
    });

    it("Should not be paused initially", async function () {
      const { poolFactory } = await loadFixture(deployPoolFactoryFixture);

      expect(await poolFactory.isPaused()).to.be.false;
    });
  });

  describe("Pool Creation", function () {
    it("Should create a pool with valid parameters", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60, // 30 days
        yieldManager: yieldManager.address
      };

      const tx = await poolFactory.connect(creator1).createPool(poolParams);
      const receipt = await tx.wait();

      // Check event emission
      expect(tx).to.emit(poolFactory, "PoolCreated")
        .withArgs(1, anyValue, creator1.address, "Test Pool", poolParams.contributionAmount, 10, poolParams.duration);

      // Check pool count
      expect(await poolFactory.getPoolCount()).to.equal(1);

      // Check creator pools
      const creatorPools = await poolFactory.getCreatorPools(creator1.address);
      expect(creatorPools.length).to.equal(1);

      // Check all pools
      const allPools = await poolFactory.getAllPools();
      expect(allPools.length).to.equal(1);
    });

    it("Should reject pool creation with invalid contribution amount", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      // Too low contribution
      const lowContribParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("0.005"), // Below minimum
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(lowContribParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidContribution");

      // Too high contribution
      const highContribParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("150"), // Above maximum
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(highContribParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidContribution");
    });

    it("Should reject pool creation with invalid member count", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      // Too few members
      const fewMembersParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 1, // Below minimum
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(fewMembersParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidMemberCount");

      // Too many members
      const manyMembersParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 150, // Above maximum
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(manyMembersParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidMemberCount");
    });

    it("Should reject pool creation with invalid duration", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      // Too short duration
      const shortDurationParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 3 * 24 * 60 * 60, // 3 days, below minimum
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(shortDurationParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidDuration");

      // Too long duration
      const longDurationParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 400 * 24 * 60 * 60, // 400 days, above maximum
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(longDurationParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidDuration");
    });

    it("Should reject pool creation with empty name", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const emptyNameParams = {
        name: "",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(emptyNameParams))
        .to.be.revertedWithCustomError(poolFactory, "PoolNameEmpty");
    });

    it("Should reject pool creation with zero yield manager address", async function () {
      const { poolFactory, creator1 } = await loadFixture(deployPoolFactoryFixture);

      const zeroAddressParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: hre.ethers.ZeroAddress
      };

      await expect(poolFactory.connect(creator1).createPool(zeroAddressParams))
        .to.be.revertedWithCustomError(poolFactory, "InvalidYieldManager");
    });

    it("Should create multiple pools from different creators", async function () {
      const { poolFactory, creator1, creator2, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams1 = {
        name: "Pool 1",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      const poolParams2 = {
        name: "Pool 2",
        contributionAmount: hre.ethers.parseEther("2"),
        maxMembers: 5,
        duration: 60 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await poolFactory.connect(creator1).createPool(poolParams1);
      await poolFactory.connect(creator2).createPool(poolParams2);

      expect(await poolFactory.getPoolCount()).to.equal(2);

      const creator1Pools = await poolFactory.getCreatorPools(creator1.address);
      const creator2Pools = await poolFactory.getCreatorPools(creator2.address);

      expect(creator1Pools.length).to.equal(1);
      expect(creator2Pools.length).to.equal(1);
    });
  });

  describe("Pool Registry", function () {
    it("Should retrieve pool by ID", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await poolFactory.connect(creator1).createPool(poolParams);

      const poolAddress = await poolFactory.getPool(1);
      expect(poolAddress).to.not.equal(hre.ethers.ZeroAddress);

      const poolId = await poolFactory.getPoolId(poolAddress);
      expect(poolId).to.equal(1);
    });

    it("Should revert when getting non-existent pool", async function () {
      const { poolFactory } = await loadFixture(deployPoolFactoryFixture);

      await expect(poolFactory.getPool(999))
        .to.be.revertedWithCustomError(poolFactory, "PoolNotFound");
    });

    it("Should validate pool addresses", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await poolFactory.connect(creator1).createPool(poolParams);

      const poolAddress = await poolFactory.getPool(1);
      expect(await poolFactory.isValidPool(poolAddress)).to.be.true;
      expect(await poolFactory.isValidPool(creator1.address)).to.be.false;
    });

    it("Should get pool info by ID", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await poolFactory.connect(creator1).createPool(poolParams);

      const poolInfo = await poolFactory.getPoolInfo(1);
      expect(poolInfo.name).to.equal("Test Pool");
      expect(poolInfo.creator).to.equal(creator1.address);
      expect(poolInfo.contributionAmount).to.equal(hre.ethers.parseEther("1"));
      expect(poolInfo.maxMembers).to.equal(10);
      expect(poolInfo.status).to.equal(0); // Open status
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant pool creator role", async function () {
      const { poolFactory, admin, creator1 } = await loadFixture(deployPoolFactoryFixture);

      const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();

      await poolFactory.connect(admin).grantPoolCreatorRole(creator1.address);
      expect(await poolFactory.hasRole(POOL_CREATOR_ROLE, creator1.address)).to.be.true;
    });

    it("Should allow admin to revoke pool creator role", async function () {
      const { poolFactory, admin, creator1 } = await loadFixture(deployPoolFactoryFixture);

      const POOL_CREATOR_ROLE = await poolFactory.POOL_CREATOR_ROLE();

      await poolFactory.connect(admin).grantPoolCreatorRole(creator1.address);
      await poolFactory.connect(admin).revokePoolCreatorRole(creator1.address);
      expect(await poolFactory.hasRole(POOL_CREATOR_ROLE, creator1.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      const { poolFactory, creator1, creator2 } = await loadFixture(deployPoolFactoryFixture);

      await expect(poolFactory.connect(creator1).grantPoolCreatorRole(creator2.address))
        .to.be.reverted;
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency admin to pause factory", async function () {
      const { poolFactory, admin } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(admin).setPaused(true);
      expect(await poolFactory.isPaused()).to.be.true;

      await expect(poolFactory.connect(admin).setPaused(true))
        .to.emit(poolFactory, "PauseChanged")
        .withArgs(admin.address, true);
    });

    it("Should reject pool creation when paused", async function () {
      const { poolFactory, admin, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(admin).setPaused(true);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(poolParams))
        .to.be.revertedWithCustomError(poolFactory, "FactoryPaused");
    });

    it("Should not allow non-emergency admin to pause", async function () {
      const { poolFactory, creator1 } = await loadFixture(deployPoolFactoryFixture);

      await expect(poolFactory.connect(creator1).setPaused(true))
        .to.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for pool creation", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Test Pool",
        contributionAmount: hre.ethers.parseEther("1"),
        maxMembers: 10,
        duration: 30 * 24 * 60 * 60,
        yieldManager: yieldManager.address
      };

      const tx = await poolFactory.connect(creator1).createPool(poolParams);
      const receipt = await tx.wait();

      // Gas usage should be reasonable (less than 4M gas - contract creation is expensive)
      expect(receipt!.gasUsed).to.be.lessThan(4_000_000);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum values correctly", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Max Pool",
        contributionAmount: await poolFactory.MAX_CONTRIBUTION(),
        maxMembers: await poolFactory.MAX_MEMBERS(),
        duration: await poolFactory.MAX_DURATION(),
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(poolParams))
        .to.not.be.reverted;
    });

    it("Should handle minimum values correctly", async function () {
      const { poolFactory, creator1, yieldManager } = await loadFixture(deployPoolFactoryFixture);

      const poolParams = {
        name: "Min Pool",
        contributionAmount: await poolFactory.MIN_CONTRIBUTION(),
        maxMembers: await poolFactory.MIN_MEMBERS(),
        duration: await poolFactory.MIN_DURATION(),
        yieldManager: yieldManager.address
      };

      await expect(poolFactory.connect(creator1).createPool(poolParams))
        .to.not.be.reverted;
    });
  });
});
