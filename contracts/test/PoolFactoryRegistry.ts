import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("PoolFactory - Global Constraints & Registry", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployPoolFactoryFixture() {
    const [admin, creator1, creator2, creator3, yieldManager] = await hre.ethers.getSigners();

    // Deploy PoolFactory
    const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
    const poolFactory = await PoolFactory.deploy(admin.address);

    const poolParams = {
      name: "Test Pool",
      contributionAmount: hre.ethers.parseEther("1"),
      maxMembers: 10,
      duration: 30 * 24 * 60 * 60, // 30 days
      yieldManager: yieldManager.address
    };

    return { poolFactory, admin, creator1, creator2, creator3, yieldManager, poolParams };
  }

  describe("Global Constraints Configuration", function () {
    it("Should initialize with default global constraints", async function () {
      const { poolFactory } = await loadFixture(deployPoolFactoryFixture);

      const constraints = await poolFactory.getGlobalConstraints();
      expect(constraints.maxTotalPools).to.equal(10000);
      expect(constraints.maxPoolsPerCreator).to.equal(50);
      expect(constraints.maxActivePoolsPerCreator).to.equal(10);
      expect(constraints.minTimeBetweenPools).to.equal(3600); // 1 hour
      expect(constraints.enforceConstraints).to.be.true;
    });

    it("Should allow admin to update global constraints", async function () {
      const { poolFactory, admin } = await loadFixture(deployPoolFactoryFixture);

      const newConstraints = {
        maxTotalPools: 5000,
        maxPoolsPerCreator: 25,
        maxActivePoolsPerCreator: 5,
        minTimeBetweenPools: 1800, // 30 minutes
        enforceConstraints: true
      };

      await expect(poolFactory.connect(admin).updateGlobalConstraints(newConstraints))
        .to.emit(poolFactory, "GlobalConstraintsUpdated")
        .withArgs(admin.address, [5000, 25, 5, 1800, true]);

      const updatedConstraints = await poolFactory.getGlobalConstraints();
      expect(updatedConstraints.maxTotalPools).to.equal(5000);
      expect(updatedConstraints.maxPoolsPerCreator).to.equal(25);
      expect(updatedConstraints.maxActivePoolsPerCreator).to.equal(5);
      expect(updatedConstraints.minTimeBetweenPools).to.equal(1800);
    });

    it("Should reject invalid constraints", async function () {
      const { poolFactory, admin } = await loadFixture(deployPoolFactoryFixture);

      // Zero maxTotalPools
      const invalidConstraints1 = {
        maxTotalPools: 0,
        maxPoolsPerCreator: 25,
        maxActivePoolsPerCreator: 5,
        minTimeBetweenPools: 1800,
        enforceConstraints: true
      };

      await expect(poolFactory.connect(admin).updateGlobalConstraints(invalidConstraints1))
        .to.be.revertedWithCustomError(poolFactory, "InvalidConstraintValue");

      // maxActivePoolsPerCreator > maxPoolsPerCreator
      const invalidConstraints2 = {
        maxTotalPools: 5000,
        maxPoolsPerCreator: 5,
        maxActivePoolsPerCreator: 10,
        minTimeBetweenPools: 1800,
        enforceConstraints: true
      };

      await expect(poolFactory.connect(admin).updateGlobalConstraints(invalidConstraints2))
        .to.be.revertedWithCustomError(poolFactory, "InvalidConstraintValue");
    });

    it("Should not allow non-admin to update constraints", async function () {
      const { poolFactory, creator1 } = await loadFixture(deployPoolFactoryFixture);

      const newConstraints = {
        maxTotalPools: 5000,
        maxPoolsPerCreator: 25,
        maxActivePoolsPerCreator: 5,
        minTimeBetweenPools: 1800,
        enforceConstraints: true
      };

      await expect(poolFactory.connect(creator1).updateGlobalConstraints(newConstraints))
        .to.be.reverted;
    });
  });

  describe("Pool Statistics Tracking", function () {
    it("Should initialize with zero statistics", async function () {
      const { poolFactory } = await loadFixture(deployPoolFactoryFixture);

      const stats = await poolFactory.getPoolStatistics();
      expect(stats.totalPools).to.equal(0);
      expect(stats.activePools).to.equal(0);
      expect(stats.completedPools).to.equal(0);
      expect(stats.totalValueLocked).to.equal(0);
      expect(stats.totalYieldGenerated).to.equal(0);
    });

    it("Should update statistics when pools are created", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);

      const stats = await poolFactory.getPoolStatistics();
      expect(stats.totalPools).to.equal(1);
      expect(stats.activePools).to.equal(1);
      expect(stats.completedPools).to.equal(0);
    });

    it("Should emit PoolStatisticsUpdated event", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await expect(poolFactory.connect(creator1).createPool(poolParams))
        .to.emit(poolFactory, "PoolStatisticsUpdated")
        .withArgs(1, 1, 0);
    });

    it("Should track multiple pool creation", async function () {
      const { poolFactory, creator1, creator2, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Advance time to avoid rate limiting
      await time.increase(3600);
      await poolFactory.connect(creator1).createPool(poolParams);
      
      await time.increase(3600);
      await poolFactory.connect(creator2).createPool({
        ...poolParams,
        name: "Pool 2"
      });

      const stats = await poolFactory.getPoolStatistics();
      expect(stats.totalPools).to.equal(2);
      expect(stats.activePools).to.equal(2);
    });
  });

  describe("Creator Pool Tracking", function () {
    it("Should track active pools per creator", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      expect(await poolFactory.getActivePoolsCount(creator1.address)).to.equal(0);

      await poolFactory.connect(creator1).createPool(poolParams);

      expect(await poolFactory.getActivePoolsCount(creator1.address)).to.equal(1);
    });

    it("Should track last pool creation timestamp", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      expect(await poolFactory.getLastPoolCreation(creator1.address)).to.equal(0);

      const tx = await poolFactory.connect(creator1).createPool(poolParams);
      const receipt = await tx.wait();
      const timestamp = (await hre.ethers.provider.getBlock(receipt!.blockNumber))!.timestamp;

      expect(await poolFactory.getLastPoolCreation(creator1.address)).to.equal(timestamp);
    });

    it("Should update active pool count when status changes", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);
      const poolAddress = await poolFactory.getPool(1);

      expect(await poolFactory.getActivePoolsCount(creator1.address)).to.equal(1);

      // Simulate pool completion
      await poolFactory.connect(admin).updatePoolStatus(poolAddress, 3); // Completed status

      expect(await poolFactory.getActivePoolsCount(creator1.address)).to.equal(0);
    });
  });

  describe("Global Constraints Enforcement", function () {
    it("Should enforce maximum pools per creator", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set strict limit
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 10000,
        maxPoolsPerCreator: 2,
        maxActivePoolsPerCreator: 2,
        minTimeBetweenPools: 0, // Disable time limit for testing
        enforceConstraints: true
      });

      // Create first pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Create second pool
      await poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 2"
      });

      // Third pool should fail
      await expect(poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 3"
      })).to.be.revertedWithCustomError(poolFactory, "MaxPoolsPerCreatorReached");
    });

    it("Should enforce maximum active pools per creator", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set strict limit for active pools
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 10000,
        maxPoolsPerCreator: 5,
        maxActivePoolsPerCreator: 1,
        minTimeBetweenPools: 0,
        enforceConstraints: true
      });

      // Create first pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Second active pool should fail
      await expect(poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 2"
      })).to.be.revertedWithCustomError(poolFactory, "MaxActivePoolsPerCreatorReached");
    });

    it("Should enforce minimum time between pool creation", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set time limit
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 10000,
        maxPoolsPerCreator: 5,
        maxActivePoolsPerCreator: 5,
        minTimeBetweenPools: 3600, // 1 hour
        enforceConstraints: true
      });

      // Create first pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Immediate second pool should fail
      await expect(poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 2"
      })).to.be.revertedWithCustomError(poolFactory, "PoolCreationTooFrequent");

      // After time passes, should succeed
      await time.increase(3600);
      await expect(poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 2"
      })).to.not.be.reverted;
    });

    it("Should enforce maximum total pools", async function () {
      const { poolFactory, admin, creator1, creator2, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set very low total limit
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 1,
        maxPoolsPerCreator: 10,
        maxActivePoolsPerCreator: 10,
        minTimeBetweenPools: 0,
        enforceConstraints: true
      });

      // Create first pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Second pool by different creator should fail
      await expect(poolFactory.connect(creator2).createPool({
        ...poolParams,
        name: "Pool 2"
      })).to.be.revertedWithCustomError(poolFactory, "MaxPoolsReached");
    });

    it("Should allow pool creation when constraints are disabled", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Disable constraints
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 1,
        maxPoolsPerCreator: 1,
        maxActivePoolsPerCreator: 1,
        minTimeBetweenPools: 3600,
        enforceConstraints: false // Disabled
      });

      // Should be able to create multiple pools despite limits
      await poolFactory.connect(creator1).createPool(poolParams);
      await poolFactory.connect(creator1).createPool({
        ...poolParams,
        name: "Pool 2"
      });

      expect(await poolFactory.getPoolCount()).to.equal(2);
    });
  });

  describe("Pool Status Management", function () {
    it("Should track pool status", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);
      const poolAddress = await poolFactory.getPool(1);

      expect(await poolFactory.getPoolStatus(poolAddress)).to.equal(0); // Open status
    });

    it("Should allow admin to update pool status", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);
      const poolAddress = await poolFactory.getPool(1);

      await poolFactory.connect(admin).updatePoolStatus(poolAddress, 3); // Completed

      expect(await poolFactory.getPoolStatus(poolAddress)).to.equal(3);
    });

    it("Should get pools by status", async function () {
      const { poolFactory, creator1, creator2, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Create pools
      await time.increase(3600);
      await poolFactory.connect(creator1).createPool(poolParams);
      const pool1Address = await poolFactory.getPool(1);

      await time.increase(3600);
      await poolFactory.connect(creator2).createPool({
        ...poolParams,
        name: "Pool 2"
      });
      const pool2Address = await poolFactory.getPool(2);

      // All should be Open initially
      const openPools = await poolFactory.getPoolsByStatus(0); // Open
      expect(openPools.length).to.equal(2);
      expect(openPools).to.include(pool1Address);
      expect(openPools).to.include(pool2Address);

      // Complete one pool
      await poolFactory.updatePoolStatus(pool1Address, 3); // Completed

      const completedPools = await poolFactory.getPoolsByStatus(3); // Completed
      expect(completedPools.length).to.equal(1);
      expect(completedPools[0]).to.equal(pool1Address);
    });
  });

  describe("Pool Creation Eligibility", function () {
    it("Should check if creator can create pool", async function () {
      const { poolFactory, creator1 } = await loadFixture(deployPoolFactoryFixture);

      const [canCreate, reason] = await poolFactory.canCreatePool(creator1.address);
      expect(canCreate).to.be.true;
      expect(reason).to.equal("");
    });

    it("Should return false with reason when constraints are violated", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set strict limits
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 1,
        maxPoolsPerCreator: 1,
        maxActivePoolsPerCreator: 1,
        minTimeBetweenPools: 3600,
        enforceConstraints: true
      });

      // Create a pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Check if can create another
      const [canCreate, reason] = await poolFactory.canCreatePool(creator1.address);
      expect(canCreate).to.be.false;
      expect(reason).to.not.equal("");
    });

    it("Should handle time-based restrictions", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      // Set time limit
      await poolFactory.connect(admin).updateGlobalConstraints({
        maxTotalPools: 10000,
        maxPoolsPerCreator: 10,
        maxActivePoolsPerCreator: 10,
        minTimeBetweenPools: 3600,
        enforceConstraints: true
      });

      // Create a pool
      await poolFactory.connect(creator1).createPool(poolParams);

      // Should not be able to create immediately
      const [canCreate1, reason1] = await poolFactory.canCreatePool(creator1.address);
      expect(canCreate1).to.be.false;
      expect(reason1).to.include("frequent");

      // After time passes, should be able to create
      await time.increase(3600);
      const [canCreate2, reason2] = await poolFactory.canCreatePool(creator1.address);
      expect(canCreate2).to.be.true;
      expect(reason2).to.equal("");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle invalid pool address in status update", async function () {
      const { poolFactory, admin, creator1 } = await loadFixture(deployPoolFactoryFixture);

      await expect(poolFactory.connect(admin).updatePoolStatus(creator1.address, 1))
        .to.be.revertedWithCustomError(poolFactory, "PoolNotFound");
    });

    it("Should handle non-admin status update", async function () {
      const { poolFactory, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);
      const poolAddress = await poolFactory.getPool(1);

      await expect(poolFactory.connect(creator1).updatePoolStatus(poolAddress, 1))
        .to.be.revertedWithCustomError(poolFactory, "UnauthorizedAccess");
    });

    it("Should handle statistics update when no active pools exist", async function () {
      const { poolFactory, admin, creator1, poolParams } = await loadFixture(deployPoolFactoryFixture);

      await poolFactory.connect(creator1).createPool(poolParams);
      const poolAddress = await poolFactory.getPool(1);

      // Complete the pool (should not underflow)
      await expect(poolFactory.connect(admin).updatePoolStatus(poolAddress, 3))
        .to.not.be.reverted;

      const stats = await poolFactory.getPoolStatistics();
      expect(stats.activePools).to.equal(0);
      expect(stats.completedPools).to.equal(1);
    });
  });
});
