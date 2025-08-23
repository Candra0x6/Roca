import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("YieldManager (SC-006)", function () {
    // Deploy fixture for YieldManager testing
    async function deployYieldManagerFixture() {
        const [admin, poolCreator, member1, member2] = await hre.ethers.getSigners();

        // Deploy YieldManager
        const YieldManager = await hre.ethers.getContractFactory("YieldManager");
        const yieldManager = await YieldManager.deploy();

        return {
            yieldManager,
            admin,
            poolCreator,
            member1,
            member2
        };
    }

    const FIXED_APY = 500; // 5% in basis points
    const BASIS_POINTS = 10000;
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

    describe("Deployment", function () {
        it("Should set the correct admin role", async function () {
            const { yieldManager, admin } = await loadFixture(deployYieldManagerFixture);
            
            const DEFAULT_ADMIN_ROLE = await yieldManager.DEFAULT_ADMIN_ROLE();
            expect(await yieldManager.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("Should set the correct strategy manager role", async function () {
            const { yieldManager, admin } = await loadFixture(deployYieldManagerFixture);
            
            const STRATEGY_MANAGER_ROLE = await yieldManager.STRATEGY_MANAGER_ROLE();
            expect(await yieldManager.hasRole(STRATEGY_MANAGER_ROLE, admin.address)).to.be.true;
        });

        it("Should initialize with correct constants", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            expect(await yieldManager.FIXED_APY()).to.equal(FIXED_APY);
            expect(await yieldManager.BASIS_POINTS()).to.equal(BASIS_POINTS);
            expect(await yieldManager.SECONDS_PER_YEAR()).to.equal(SECONDS_PER_YEAR);
        });

        it("Should initialize mock strategy correctly", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const strategy = await yieldManager.getStrategyInfo(0); // MockYield = 0
            expect(strategy.name).to.equal("Mock Yield Strategy");
            expect(strategy.expectedAPY).to.equal(FIXED_APY);
            expect(strategy.isActive).to.be.true;
            expect(strategy.strategyAddress).to.equal(yieldManager.target);
        });
    });

    describe("Deposit Function", function () {
        it("Should accept valid deposits", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            const depositAmount = hre.ethers.parseEther("2");
            const poolId = 1;

            await expect(
                yieldManager.connect(poolCreator).deposit(poolId, 0, { value: depositAmount })
            ).to.emit(yieldManager, "FundsStaked")
              .withArgs(poolId, depositAmount, 0, hre.ethers.parseEther("0.1")); // 5% of 2 ETH

            // Check investment record
            const investment = await yieldManager.getPoolInvestment(poolId);
            expect(investment.poolId).to.equal(poolId);
            expect(investment.principalAmount).to.equal(depositAmount);
            expect(investment.currentValue).to.equal(depositAmount);
            expect(investment.yieldGenerated).to.equal(0);
            expect(investment.isActive).to.be.true;
        });

        it("Should revert on zero deposit", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await expect(
                yieldManager.connect(poolCreator).deposit(1, 0, { value: 0 })
            ).to.be.revertedWithCustomError(yieldManager, "ZeroDeposit");
        });

        it("Should revert on unsupported strategy", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await expect(
                yieldManager.connect(poolCreator).deposit(1, 1, { value: hre.ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(yieldManager, "UnsupportedStrategy");
        });

        it("Should update global tracking correctly", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            const depositAmount = hre.ethers.parseEther("3");
            const initialManagedFunds = await yieldManager.totalManagedFunds();

            await yieldManager.connect(poolCreator).deposit(1, 0, { value: depositAmount });

            expect(await yieldManager.totalManagedFunds()).to.equal(
                initialManagedFunds + depositAmount
            );
        });
    });

    describe("Yield Calculation", function () {
        it("Should calculate yield correctly over time", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });

            // Move forward 1 year (365 days)
            await time.increase(SECONDS_PER_YEAR);

            const currentYield = await yieldManager.getYield(1);
            // Expected: 1 ETH * 5% = 0.05 ETH
            expect(currentYield).to.be.closeTo(
                hre.ethers.parseEther("0.05"),
                hre.ethers.parseEther("0.001") // Allow small margin for precision
            );
        });

        it("Should update yield when updateYield is called", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });

            // Move forward 30 days
            await time.increase(30 * 24 * 60 * 60);

            await expect(yieldManager.updateYield(1))
                .to.emit(yieldManager, "YieldUpdated");

            const investment = await yieldManager.getPoolInvestment(1);
            expect(investment.yieldGenerated).to.be.gt(0);
        });
    });

    describe("Withdrawal Function", function () {
        it("Should withdraw principal and yield correctly", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });

            // Move forward to generate some yield
            await time.increase(SECONDS_PER_YEAR / 2); // 6 months

            await expect(yieldManager.connect(poolCreator).withdraw(1))
                .to.emit(yieldManager, "FundsWithdrawn");

            // Check that investment is marked as inactive
            const investment = await yieldManager.getPoolInvestment(1);
            expect(investment.isActive).to.be.false;
        });

        it("Should revert if no active investment", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await expect(
                yieldManager.connect(poolCreator).withdraw(999)
            ).to.be.revertedWithCustomError(yieldManager, "NoActiveInvestment");
        });
    });

    describe("View Functions", function () {
        it("Should return correct total value", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });
            await time.increase(SECONDS_PER_YEAR / 4); // 3 months
            
            const totalValue = await yieldManager.getTotalValue(1);
            const currentYield = await yieldManager.getYield(1);
            
            expect(totalValue).to.equal(hre.ethers.parseEther("1") + currentYield);
        });

        it("Should return active strategies", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const strategies = await yieldManager.getActiveStrategies();
            
            expect(strategies.length).to.equal(1);
            expect(strategies[0].name).to.equal("Mock Yield Strategy");
            expect(strategies[0].expectedAPY).to.equal(FIXED_APY);
        });

        it("Should calculate projected yield correctly", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const params = {
                principal: hre.ethers.parseEther("1"),
                timeElapsed: SECONDS_PER_YEAR,
                annualRate: FIXED_APY,
                compoundFrequency: 1
            };
            
            const projectedYield = await yieldManager.calculateProjectedYield(params);
            expect(projectedYield).to.be.closeTo(
                hre.ethers.parseEther("0.05"),
                hre.ethers.parseEther("0.001")
            );
        });

        it("Should return current APY", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const apy = await yieldManager.getCurrentAPY(1);
            expect(apy).to.equal(FIXED_APY);
        });

        it("Should check strategy availability", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const isAvailable = await yieldManager.isStrategyAvailable(0, hre.ethers.parseEther("1"));
            expect(isAvailable).to.be.true;

            const isUnavailable = await yieldManager.isStrategyAvailable(1, hre.ethers.parseEther("1"));
            expect(isUnavailable).to.be.false;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow admin to pause contract", async function () {
            const { yieldManager, admin, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(admin).pause();
            
            await expect(
                yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") })
            ).to.be.reverted;
        });

        it("Should allow admin to unpause contract", async function () {
            const { yieldManager, admin, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(admin).pause();
            await yieldManager.connect(admin).unpause();
            
            // Should work after unpause
            await expect(
                yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") })
            ).to.not.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero yield for inactive pools", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const currentYield = await yieldManager.getYield(999);
            expect(currentYield).to.equal(0);
        });

        it("Should handle getTotalValue for inactive pools", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const totalValue = await yieldManager.getTotalValue(999);
            expect(totalValue).to.equal(0);
        });

        it("Should return empty strategy info for unsupported strategies", async function () {
            const { yieldManager } = await loadFixture(deployYieldManagerFixture);
            
            const strategyInfo = await yieldManager.getStrategyInfo(1);
            expect(strategyInfo.name).to.equal("");
            expect(strategyInfo.expectedAPY).to.equal(0);
            expect(strategyInfo.isActive).to.be.false;
        });
    });

    describe("Gas Efficiency", function () {
        it("Should have reasonable gas costs for deposit", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            const tx = await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });
            const receipt = await tx.wait();
            
            expect(receipt?.gasUsed).to.be.lt(250000); // Should be under 250k gas
        });

        it("Should have reasonable gas costs for withdrawal", async function () {
            const { yieldManager, poolCreator } = await loadFixture(deployYieldManagerFixture);
            
            await yieldManager.connect(poolCreator).deposit(1, 0, { value: hre.ethers.parseEther("1") });
            
            const tx = await yieldManager.connect(poolCreator).withdraw(1);
            const receipt = await tx.wait();
            
            expect(receipt?.gasUsed).to.be.lt(150000); // Should be under 150k gas
        });
    });
});
