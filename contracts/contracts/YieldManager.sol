// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./interfaces/IYieldManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title YieldManager
 * @author Arisan+ Team
 * @notice Dummy YieldManager implementation for MVP
 * @dev Simulates 5% APY growth without real DeFi integration
 * 
 * This contract provides a simplified yield management system for the MVP version
 * of the Arisan+ platform. It simulates yield generation at a fixed 5% APY rate
 * without connecting to actual DeFi protocols.
 * 
 * Key features:
 * - Fixed 5% APY simulation
 * - Time-based yield calculation
 * - Pool-based fund management
 * - Simple deposit/withdraw mechanics
 */
contract YieldManager is IYieldManager, AccessControl, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Thrown when pool has no active investment
    error NoActiveInvestment();
    
    /// @notice Thrown when deposit amount is zero
    error ZeroDeposit();
    
    /// @notice Thrown when strategy is not supported
    error UnsupportedStrategy();
    
    /// @notice Thrown when withdrawal fails
    error WithdrawalFailed();

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Role for managing yield strategies
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    
    /// @notice Fixed APY rate for MVP (5% = 500 basis points)
    uint256 public constant FIXED_APY = 500;
    
    /// @notice Basis points denominator (100% = 10,000 basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Seconds in a year for APY calculations
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Mapping of pool IDs to their investment details
    mapping(uint256 => PoolInvestment) private _poolInvestments;
    
    /// @notice Mock yield strategy configuration
    StrategyInfo private _mockStrategy;
    
    /// @notice Total amount currently managed across all pools
    uint256 public totalManagedFunds;
    
    /// @notice Total yield generated across all pools
    uint256 public totalYieldGenerated;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Initialize the YieldManager contract
     * @dev Sets up access control and initializes the mock strategy
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(STRATEGY_MANAGER_ROLE, msg.sender);
        
        // Initialize mock strategy
        _mockStrategy = StrategyInfo({
            strategyType: YieldStrategy.MockYield,
            name: "Mock Yield Strategy",
            description: "Simulated 5% APY yield for MVP testing",
            expectedAPY: FIXED_APY,
            minDeposit: 0.01 ether,
            maxDeposit: 0, // No maximum
            lockPeriod: 0, // No lock period for MVP
            isActive: true,
            strategyAddress: address(this),
            totalDeposited: 0,
            totalYieldGenerated: 0
        });
    }

    /*//////////////////////////////////////////////////////////////
                          CORE YIELD FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Deposit funds for yield generation
     * @param poolId Identifier of the associated pool
     * @param strategy Yield strategy to use (only MockYield supported)
     * @dev Accepts ETH deposits and starts yield generation tracking
     * 
     * Requirements:
     * - Contract must not be paused
     * - Deposit amount must be greater than zero
     * - Strategy must be MockYield (only supported strategy for MVP)
     * - Pool must not have an existing active investment
     */
    function deposit(uint256 poolId, YieldStrategy strategy) 
        external 
        payable 
        override 
        nonReentrant 
        whenNotPaused 
    {
        if (msg.value == 0) revert ZeroDeposit();
        if (strategy != YieldStrategy.MockYield) revert UnsupportedStrategy();
        if (_poolInvestments[poolId].isActive) revert("Pool already has active investment");
        
        // Create new investment record
        _poolInvestments[poolId] = PoolInvestment({
            poolId: poolId,
            poolAddress: msg.sender,
            principalAmount: msg.value,
            currentValue: msg.value,
            yieldGenerated: 0,
            strategy: strategy,
            depositedAt: block.timestamp,
            lastYieldUpdate: block.timestamp,
            isActive: true
        });
        
        // Update global tracking
        totalManagedFunds += msg.value;
        _mockStrategy.totalDeposited += msg.value;
        
        emit FundsStaked(poolId, msg.value, strategy, _calculateExpectedYield(msg.value, SECONDS_PER_YEAR));
    }

    /**
     * @notice Withdraw all funds (principal + yield) for a pool
     * @param poolId Identifier of the pool
     * @return principal Original principal amount
     * @return yield Total yield generated
     * @dev Calculates current yield, updates records, and transfers total funds back
     * 
     * Requirements:
     * - Pool must have an active investment
     * - Transfer back to pool must succeed
     */
    function withdraw(uint256 poolId) 
        external 
        override 
        nonReentrant 
        returns (uint256 principal, uint256 yield) 
    {
        PoolInvestment storage investment = _poolInvestments[poolId];
        if (!investment.isActive) revert NoActiveInvestment();
        
        // Update yield before withdrawal
        _updatePoolYield(poolId);
        
        principal = investment.principalAmount;
        yield = investment.yieldGenerated;
        uint256 totalAmount = principal + yield;
        
        // Ensure contract has enough balance to transfer
        if (address(this).balance < totalAmount) {
            // Cap the yield to available balance minus principal
            yield = address(this).balance > principal ? address(this).balance - principal : 0;
            totalAmount = principal + yield;
        }
        
        // Update global tracking
        totalManagedFunds -= principal;
        _mockStrategy.totalDeposited -= principal;
        
        // Mark investment as inactive
        investment.isActive = false;
        
        // Transfer funds back to pool (only if there's an amount to transfer)
        if (totalAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
            if (!success) {
                // Revert state changes on failed transfer
                _poolInvestments[poolId].isActive = true;
                totalManagedFunds += principal;
                _mockStrategy.totalDeposited += principal;
                revert WithdrawalFailed();
            }
        }
        
        emit FundsWithdrawn(poolId, principal, yield, totalAmount);
    }

    /**
     * @notice Update yield calculation for a specific pool
     * @param poolId Identifier of the pool
     * @dev Calculates and applies yield based on time elapsed since last update
     */
    function updateYield(uint256 poolId) external override {
        _updatePoolYield(poolId);
    }

    /**
     * @notice Batch update yield for multiple pools
     * @param poolIds Array of pool identifiers
     * @dev Efficiently updates yield for multiple pools in one transaction
     */
    function batchUpdateYield(uint256[] calldata poolIds) external override {
        for (uint256 i = 0; i < poolIds.length; i++) {
            _updatePoolYield(poolIds[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get current yield for a pool
     * @param poolId Identifier of the pool
     * @return currentYield Current yield amount generated
     */
    function getYield(uint256 poolId) external view override returns (uint256 currentYield) {
        PoolInvestment memory investment = _poolInvestments[poolId];
        if (!investment.isActive) return 0;
        
        return investment.yieldGenerated + _calculatePendingYield(poolId);
    }

    /**
     * @notice Get total value (principal + yield) for a pool
     * @param poolId Identifier of the pool
     * @return totalValue Current total value
     */
    function getTotalValue(uint256 poolId) external view override returns (uint256 totalValue) {
        PoolInvestment memory investment = _poolInvestments[poolId];
        if (!investment.isActive) return 0;
        
        uint256 currentYield = investment.yieldGenerated + _calculatePendingYield(poolId);
        return investment.principalAmount + currentYield;
    }

    /**
     * @notice Get pool investment information
     * @param poolId Identifier of the pool
     * @return investment Complete investment information
     */
    function getPoolInvestment(uint256 poolId) 
        external 
        view 
        override 
        returns (PoolInvestment memory investment) 
    {
        return _poolInvestments[poolId];
    }

    /**
     * @notice Get yield strategy information
     * @param strategy Strategy type (only MockYield supported)
     * @return strategyInfo Complete strategy information
     */
    function getStrategyInfo(YieldStrategy strategy) 
        external 
        view 
        override 
        returns (StrategyInfo memory strategyInfo) 
    {
        if (strategy == YieldStrategy.MockYield) {
            return _mockStrategy;
        }
        // Return empty struct for unsupported strategies
        return StrategyInfo({
            strategyType: strategy,
            name: "",
            description: "",
            expectedAPY: 0,
            minDeposit: 0,
            maxDeposit: 0,
            lockPeriod: 0,
            isActive: false,
            strategyAddress: address(0),
            totalDeposited: 0,
            totalYieldGenerated: 0
        });
    }

    /**
     * @notice Get all active strategies
     * @return strategies Array of active strategy information
     */
    function getActiveStrategies() 
        external 
        view 
        override 
        returns (StrategyInfo[] memory strategies) 
    {
        strategies = new StrategyInfo[](1);
        strategies[0] = _mockStrategy;
    }

    /**
     * @notice Calculate projected yield for given parameters
     * @param params Yield calculation parameters
     * @return projectedYield Calculated yield amount
     */
    function calculateProjectedYield(YieldParams calldata params) 
        external 
        pure 
        override 
        returns (uint256 projectedYield) 
    {
        return _calculateYield(params.principal, params.timeElapsed, params.annualRate);
    }

    /**
     * @notice Calculate current APY for a pool
     * @return currentAPY Current annualized percentage yield (always returns fixed 5% APY)
     */
    function getCurrentAPY(uint256 /* poolId */) external pure override returns (uint256 currentAPY) {
        return FIXED_APY;
    }

    /**
     * @notice Get best available strategy for a given amount
     * @param amount Investment amount
     * @return strategy Recommended strategy type (always MockYield)
     * @return expectedYield Expected yield for the amount over one year
     */
    function getBestStrategy(uint256 amount) 
        external 
        pure 
        override 
        returns (YieldStrategy strategy, uint256 expectedYield) 
    {
        return (YieldStrategy.MockYield, _calculateExpectedYield(amount, SECONDS_PER_YEAR));
    }

    /**
     * @notice Check if strategy is available for amount
     * @param strategy Strategy type to check
     * @param amount Investment amount
     * @return isAvailable True if strategy can accept the amount
     */
    function isStrategyAvailable(YieldStrategy strategy, uint256 amount) 
        external 
        view 
        override 
        returns (bool isAvailable) 
    {
        if (strategy != YieldStrategy.MockYield || !_mockStrategy.isActive) {
            return false;
        }
        return amount >= _mockStrategy.minDeposit && 
               (_mockStrategy.maxDeposit == 0 || amount <= _mockStrategy.maxDeposit);
    }

    /**
     * @notice Get total statistics across all strategies
     * @return totalInvested Total amount currently invested
     * @return totalYield Total yield generated across all pools
     * @return averageAPY Weighted average APY across strategies
     */
    function getTotalStats() 
        external 
        view 
        override 
        returns (uint256 totalInvested, uint256 totalYield, uint256 averageAPY) 
    {
        return (totalManagedFunds, totalYieldGenerated, FIXED_APY);
    }

    /**
     * @notice Get strategy performance metrics
     * @param strategy Strategy type
     * @return totalDeposits Total deposits in strategy
     * @return totalYield Total yield generated
     * @return averageAPY Average APY performance
     * @return activeInvestments Number of active investments
     */
    function getStrategyPerformance(YieldStrategy strategy) 
        external 
        view 
        override 
        returns (
            uint256 totalDeposits,
            uint256 totalYield,
            uint256 averageAPY,
            uint256 activeInvestments
        ) 
    {
        if (strategy == YieldStrategy.MockYield) {
            return (_mockStrategy.totalDeposited, totalYieldGenerated, FIXED_APY, 0);
        }
        return (0, 0, 0, 0);
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS (STUBS)
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Change yield strategy for a pool (not implemented in MVP)
     */
    function changeStrategy(uint256 /* poolId */, YieldStrategy /* newStrategy */) 
        external 
        pure 
        override 
    {
        revert("Not implemented in MVP");
    }

    /**
     * @notice Add new yield strategy (not implemented in MVP)
     */
    function addStrategy(YieldStrategy /* strategy */, StrategyInfo calldata /* strategyInfo */) 
        external 
        pure 
        override 
    {
        revert("Not implemented in MVP");
    }

    /**
     * @notice Update existing yield strategy configuration (not implemented in MVP)
     */
    function updateStrategy(YieldStrategy /* strategy */, StrategyInfo calldata /* strategyInfo */) 
        external 
        pure 
        override 
    {
        revert("Not implemented in MVP");
    }

    /**
     * @notice Enable or disable a yield strategy (not implemented in MVP)
     */
    function setStrategyActive(YieldStrategy /* strategy */, bool /* isActive */) 
        external 
        pure 
        override 
    {
        revert("Not implemented in MVP");
    }

    /**
     * @notice Emergency withdrawal for admin (not implemented in MVP)
     */
    function emergencyWithdraw(uint256 /* poolId */) external pure override {
        revert("Not implemented in MVP");
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Pause the contract (admin only)
     * @dev Prevents new deposits when paused
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract (admin only)
     * @dev Allows new deposits when unpaused
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Update yield for a specific pool
     * @param poolId Pool to update
     * @dev Internal function that calculates and applies pending yield
     */
    function _updatePoolYield(uint256 poolId) internal {
        PoolInvestment storage investment = _poolInvestments[poolId];
        if (!investment.isActive) return;
        
        uint256 pendingYield = _calculatePendingYield(poolId);
        if (pendingYield > 0) {
            investment.yieldGenerated += pendingYield;
            investment.currentValue += pendingYield;
            totalYieldGenerated += pendingYield;
            _mockStrategy.totalYieldGenerated += pendingYield;
            
            emit YieldUpdated(
                poolId, 
                investment.yieldGenerated, 
                investment.currentValue, 
                FIXED_APY
            );
        }
        
        investment.lastYieldUpdate = block.timestamp;
    }

    /**
     * @notice Calculate pending yield for a pool
     * @param poolId Pool to calculate yield for
     * @return pendingYield Amount of yield pending since last update
     */
    function _calculatePendingYield(uint256 poolId) internal view returns (uint256 pendingYield) {
        PoolInvestment memory investment = _poolInvestments[poolId];
        if (!investment.isActive) return 0;
        
        uint256 timeElapsed = block.timestamp - investment.lastYieldUpdate;
        return _calculateYield(investment.principalAmount, timeElapsed, FIXED_APY);
    }

    /**
     * @notice Calculate yield for given parameters
     * @param principal Principal amount
     * @param timeElapsed Time elapsed in seconds
     * @param annualRate Annual rate in basis points
     * @return yieldAmount Calculated yield amount
     */
    function _calculateYield(
        uint256 principal, 
        uint256 timeElapsed, 
        uint256 annualRate
    ) internal pure returns (uint256 yieldAmount) {
        return (principal * annualRate * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }

    /**
     * @notice Calculate expected yield for a given amount and duration
     * @param amount Principal amount
     * @param duration Duration in seconds
     * @return expectedYield Expected yield amount
     */
    function _calculateExpectedYield(uint256 amount, uint256 duration) 
        internal 
        pure 
        returns (uint256 expectedYield) 
    {
        return _calculateYield(amount, duration, FIXED_APY);
    }

    /*//////////////////////////////////////////////////////////////
                              RECEIVE
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Allow contract to receive ETH
     * @dev Required for yield distribution and emergency functions
     */
    receive() external payable {}
}
