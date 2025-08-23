import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Pool Data Structures (SC-003)", function () {
  // Deploy fixture for Pool contract testing
  async function deployPoolFixture() {
    const [creator, member1, member2, member3, otherAccount] = await hre.ethers.getSigners();

    // Deploy MockYieldManager first
    const MockYieldManager = await hre.ethers.getContractFactory("MockYieldManager");
    const mockYieldManager = await MockYieldManager.deploy();

    // Deploy a Pool contract directly for testing data structures
    const Pool = await hre.ethers.getContractFactory("Pool");
    const pool = await Pool.deploy(
      "Test Pool",
      hre.ethers.parseEther("1"), // 1 ETH contribution
      5, // Max 5 members
      30 * 24 * 60 * 60, // 30 days duration
      creator.address,
      mockYieldManager.target // Use the deployed MockYieldManager address
    );

    return { pool, mockYieldManager, creator, member1, member2, member3, otherAccount };
  }

  describe("PoolInfo Structure", function () {
    it("Should initialize PoolInfo with all required fields", async function () {
      const { pool, creator, mockYieldManager } = await loadFixture(deployPoolFixture);

      const poolInfo = await pool.getPoolInfo();
      
      // Verify all required fields are present and correct
      expect(poolInfo.creator).to.equal(creator.address);
      expect(poolInfo.name).to.equal("Test Pool");
      expect(poolInfo.contributionAmount).to.equal(hre.ethers.parseEther("1"));
      expect(poolInfo.maxMembers).to.equal(5);
      expect(poolInfo.duration).to.equal(30 * 24 * 60 * 60);
      expect(poolInfo.status).to.equal(0); // PoolStatus.Open
      expect(poolInfo.yieldManager).to.equal(mockYieldManager.target);
      
      // Verify calculated/dynamic fields
      expect(poolInfo.createdAt).to.be.greaterThan(0);
      expect(poolInfo.lockedAt).to.equal(0);
      expect(poolInfo.totalFunds).to.equal(0);
      expect(poolInfo.currentMembers).to.equal(0);
    });

    it("Should update PoolInfo fields correctly during lifecycle", async function () {
      const { pool, creator, member1, member2 } = await loadFixture(deployPoolFixture);

      // Initial state
      let poolInfo = await pool.getPoolInfo();
      expect(poolInfo.status).to.equal(0); // Open
      expect(poolInfo.currentMembers).to.equal(0);
      expect(poolInfo.totalFunds).to.equal(0);

      // After first member joins
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      poolInfo = await pool.getPoolInfo();
      expect(poolInfo.currentMembers).to.equal(1);
      expect(poolInfo.totalFunds).to.equal(hre.ethers.parseEther("1"));
      expect(poolInfo.status).to.equal(0); // Still Open

      // After second member joins
      await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
      poolInfo = await pool.getPoolInfo();
      expect(poolInfo.currentMembers).to.equal(2);
      expect(poolInfo.totalFunds).to.equal(hre.ethers.parseEther("2"));

      // After manual lock
      await pool.connect(creator).lockPool();
      poolInfo = await pool.getPoolInfo();
      expect(poolInfo.status).to.equal(2); // Active (Pool transitions to Active immediately after lock)
      expect(poolInfo.lockedAt).to.be.greaterThan(0);
    });

    it("Should maintain data integrity across state transitions", async function () {
      const { pool, creator, member1 } = await loadFixture(deployPoolFixture);

      // Record initial state
      const initialInfo = await pool.getPoolInfo();
      const initialCreator = initialInfo.creator;
      const initialName = initialInfo.name;
      const initialContribution = initialInfo.contributionAmount;
      const initialMaxMembers = initialInfo.maxMembers;
      const initialDuration = initialInfo.duration;
      const initialYieldManager = initialInfo.yieldManager;

      // Join pool and lock
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      await pool.connect(creator).lockPool();

      // Verify immutable fields haven't changed
      const lockedInfo = await pool.getPoolInfo();
      expect(lockedInfo.creator).to.equal(initialCreator);
      expect(lockedInfo.name).to.equal(initialName);
      expect(lockedInfo.contributionAmount).to.equal(initialContribution);
      expect(lockedInfo.maxMembers).to.equal(initialMaxMembers);
      expect(lockedInfo.duration).to.equal(initialDuration);
      expect(lockedInfo.yieldManager).to.equal(initialYieldManager);
    });
  });

  describe("PoolMember Structure", function () {
    it("Should initialize PoolMember with all required fields", async function () {
      const { pool, member1 } = await loadFixture(deployPoolFixture);

      // Join pool to create member record
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });

      const memberInfo = await pool.getMemberInfo(member1.address);
      
      // Verify all required fields are present and correct
      expect(memberInfo.memberAddress).to.equal(member1.address);
      expect(memberInfo.contribution).to.equal(hre.ethers.parseEther("1"));
      expect(memberInfo.joinedAt).to.be.greaterThan(0);
      expect(memberInfo.hasWithdrawn).to.be.false;
      expect(memberInfo.yieldEarned).to.equal(0);
    });

    it("Should track member data correctly for multiple members", async function () {
      const { pool, member1, member2, member3 } = await loadFixture(deployPoolFixture);

      // Members join at different times
      const tx1 = await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      const receipt1 = await tx1.wait();
      const timestamp1 = (await hre.ethers.provider.getBlock(receipt1!.blockNumber))!.timestamp;

      await time.increase(100); // Wait 100 seconds

      const tx2 = await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
      const receipt2 = await tx2.wait();
      const timestamp2 = (await hre.ethers.provider.getBlock(receipt2!.blockNumber))!.timestamp;

      await time.increase(100); // Wait another 100 seconds

      const tx3 = await pool.connect(member3).joinPool({ value: hre.ethers.parseEther("1") });
      const receipt3 = await tx3.wait();
      const timestamp3 = (await hre.ethers.provider.getBlock(receipt3!.blockNumber))!.timestamp;

      // Verify each member's data
      const member1Info = await pool.getMemberInfo(member1.address);
      expect(member1Info.memberAddress).to.equal(member1.address);
      expect(member1Info.contribution).to.equal(hre.ethers.parseEther("1"));
      expect(member1Info.joinedAt).to.equal(timestamp1);

      const member2Info = await pool.getMemberInfo(member2.address);
      expect(member2Info.memberAddress).to.equal(member2.address);
      expect(member2Info.joinedAt).to.equal(timestamp2);

      const member3Info = await pool.getMemberInfo(member3.address);
      expect(member3Info.memberAddress).to.equal(member3.address);
      expect(member3Info.joinedAt).to.equal(timestamp3);

      // Verify timestamps are different
      expect(timestamp2).to.be.greaterThan(timestamp1);
      expect(timestamp3).to.be.greaterThan(timestamp2);
    });

    it("Should return empty struct for non-members", async function () {
      const { pool, member1, member2 } = await loadFixture(deployPoolFixture);

      // Only member1 joins
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });

      // Check non-member returns empty struct
      const nonMemberInfo = await pool.getMemberInfo(member2.address);
      expect(nonMemberInfo.memberAddress).to.equal(hre.ethers.ZeroAddress);
      expect(nonMemberInfo.contribution).to.equal(0);
      expect(nonMemberInfo.joinedAt).to.equal(0);
      expect(nonMemberInfo.hasWithdrawn).to.be.false;
      expect(nonMemberInfo.yieldEarned).to.equal(0);
    });

    it("Should update member data during pool operations", async function () {
      const { pool, creator, member1 } = await loadFixture(deployPoolFixture);

      // Member joins
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      
      let memberInfo = await pool.getMemberInfo(member1.address);
      expect(memberInfo.hasWithdrawn).to.be.false;
      expect(memberInfo.yieldEarned).to.equal(0);

      // Lock pool and check data consistency
      await pool.connect(creator).lockPool();
      
      memberInfo = await pool.getMemberInfo(member1.address);
      expect(memberInfo.memberAddress).to.equal(member1.address);
      expect(memberInfo.contribution).to.equal(hre.ethers.parseEther("1"));
      expect(memberInfo.hasWithdrawn).to.be.false;
      // yieldEarned should still be 0 since no yield has been distributed yet
      expect(memberInfo.yieldEarned).to.equal(0);
    });
  });

  describe("Members Array Management", function () {
    it("Should maintain accurate members array", async function () {
      const { pool, member1, member2, member3 } = await loadFixture(deployPoolFixture);

      // Initial state - no members
      let members = await pool.getMembers();
      expect(members.length).to.equal(0);

      // Add first member
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      members = await pool.getMembers();
      expect(members.length).to.equal(1);
      expect(members[0]).to.equal(member1.address);

      // Add second member
      await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
      members = await pool.getMembers();
      expect(members.length).to.equal(2);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);

      // Add third member
      await pool.connect(member3).joinPool({ value: hre.ethers.parseEther("1") });
      members = await pool.getMembers();
      expect(members.length).to.equal(3);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);
      expect(members).to.include(member3.address);
    });

    it("Should handle member removal correctly", async function () {
      const { pool, member1, member2 } = await loadFixture(deployPoolFixture);

      // Add two members
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

      let members = await pool.getMembers();
      expect(members.length).to.equal(2);

      // Member1 leaves before lock
      await pool.connect(member1).leavePool();

      members = await pool.getMembers();
      expect(members.length).to.equal(1);
      expect(members[0]).to.equal(member2.address);

      // Verify member1 is no longer considered a member
      expect(await pool.isMember(member1.address)).to.be.false;
      expect(await pool.isMember(member2.address)).to.be.true;
    });

    it("Should track membership status correctly", async function () {
      const { pool, member1, member2, member3 } = await loadFixture(deployPoolFixture);

      // Initially, no one is a member
      expect(await pool.isMember(member1.address)).to.be.false;
      expect(await pool.isMember(member2.address)).to.be.false;
      expect(await pool.isMember(member3.address)).to.be.false;

      // Member1 joins
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      expect(await pool.isMember(member1.address)).to.be.true;
      expect(await pool.isMember(member2.address)).to.be.false;
      expect(await pool.isMember(member3.address)).to.be.false;

      // Member2 joins
      await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
      expect(await pool.isMember(member1.address)).to.be.true;
      expect(await pool.isMember(member2.address)).to.be.true;
      expect(await pool.isMember(member3.address)).to.be.false;
    });
  });

  describe("Data Structure Integration", function () {
    it("Should maintain consistency between PoolInfo and member data", async function () {
      const { pool, member1, member2 } = await loadFixture(deployPoolFixture);

      // Add members and verify consistency
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });

      const poolInfo = await pool.getPoolInfo();
      const members = await pool.getMembers();
      
      // Verify counts match
      expect(poolInfo.currentMembers).to.equal(members.length);
      expect(poolInfo.currentMembers).to.equal(2);

      // Verify total funds calculation
      const member1Info = await pool.getMemberInfo(member1.address);
      const member2Info = await pool.getMemberInfo(member2.address);
      const expectedTotal = member1Info.contribution + member2Info.contribution;
      expect(poolInfo.totalFunds).to.equal(expectedTotal);
    });

    it("Should handle edge cases with data structures", async function () {
      const { pool, creator, member1 } = await loadFixture(deployPoolFixture);

      // Pool with single member
      await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      
      const poolInfo = await pool.getPoolInfo();
      expect(poolInfo.currentMembers).to.equal(1);
      expect(poolInfo.totalFunds).to.equal(hre.ethers.parseEther("1"));

      // Lock pool with single member (minimum is 2, but creator can force lock)
      await pool.connect(creator).lockPool();
      
      const lockedPoolInfo = await pool.getPoolInfo();
      expect(lockedPoolInfo.status).to.equal(2); // Active (Pool transitions to Active immediately after lock)
      expect(lockedPoolInfo.currentMembers).to.equal(1); // Still 1 member
    });

    it("Should validate struct field boundaries and constraints", async function () {
      const { pool } = await loadFixture(deployPoolFixture);

      const poolInfo = await pool.getPoolInfo();
      
      // Verify non-zero required fields
      expect(poolInfo.contributionAmount).to.be.greaterThan(0);
      expect(poolInfo.maxMembers).to.be.greaterThan(0);
      expect(poolInfo.duration).to.be.greaterThan(0);
      expect(poolInfo.createdAt).to.be.greaterThan(0);
      
      // Verify address fields are valid
      expect(poolInfo.creator).to.not.equal(hre.ethers.ZeroAddress);
      expect(poolInfo.yieldManager).to.not.equal(hre.ethers.ZeroAddress);
      
      // Verify string field is not empty
      expect(poolInfo.name.length).to.be.greaterThan(0);
    });
  });

  describe("Gas Efficiency and Storage Optimization", function () {
    it("Should use reasonable gas for data structure operations", async function () {
      const { pool, member1, member2 } = await loadFixture(deployPoolFixture);

      // Test gas usage for joining (creates member struct)
      const joinTx = await pool.connect(member1).joinPool({ value: hre.ethers.parseEther("1") });
      const joinReceipt = await joinTx.wait();
      expect(joinReceipt!.gasUsed).to.be.lessThan(250_000); // Adjusted gas limit for mock YieldManager

      // Test gas usage for member data retrieval
      const memberInfo = await pool.getMemberInfo(member1.address);
      expect(memberInfo.memberAddress).to.equal(member1.address);

      // Test gas usage for pool info retrieval
      const poolInfo = await pool.getPoolInfo();
      expect(poolInfo.currentMembers).to.equal(1);

      // Multiple members should have reasonable gas usage
      const join2Tx = await pool.connect(member2).joinPool({ value: hre.ethers.parseEther("1") });
      const join2Receipt = await join2Tx.wait();
      expect(join2Receipt!.gasUsed).to.be.lessThan(200_000); // Should be less for subsequent joins
    });
  });
});
