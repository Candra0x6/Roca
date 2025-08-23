// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IYieldManager
 * @author Arisan+ Team
 * @notice Interface for Arisan+ yield management system
 * @dev Manages yield generation strategies for pool funds
 */
interface IYieldManager {
    /// @notice Yield strategy types
    enum YieldStrategy {
        MockYield,      // Dummy yield for MVP testing
        LidoStaking,    // Ethereum 2.0 staking via Lido
        AaveDeposit,    // DeFi lending via Aave
        CompoundDeposit, // DeFi lending via Compound
        CurveDeposit,   // Stable coin yield via Curve
        Custom          // Custom strategy implementation
    }

    /// @notice Yield strategy information
    struct StrategyInfo {
        YieldStrategy strategyType;  // Type of yield strategy
        string name;                 // Human-readable strategy name
        string description;          // Strategy description
        uint256 expectedAPY;         // Expected APY in basis points (100 = 1%)
        uint256 minDeposit;         // Minimum deposit amount
        uint256 maxDeposit;         // Maximum deposit amount (0 = unlimited)
        uint256 lockPeriod;         // Lock period in seconds
        bool isActive;              // Whether strategy is currently active
        address strategyAddress;    // Address of strategy implementation
        uint256 totalDeposited;     // Total amount currently deposited
        uint256 totalYieldGenerated; // Total yield generated historically
    }

    /// @notice Pool investment information
    struct PoolInvestment {
        uint256 poolId;             // Associated pool identifier
        address poolAddress;        // Pool contract address
        uint256 principalAmount;    // Original investment amount
        uint256 currentValue;       // Current total value (principal + yield)
        uint256 yieldGenerated;     // Total yield generated
        YieldStrategy strategy;     // Yield strategy used
        uint256 depositedAt;        // Timestamp of deposit
        uint256 lastYieldUpdate;    // Last time yield was calculated
        bool isActive;              // Whether investment is currently active
    }

    /// @notice Yield calculation parameters
    struct YieldParams {
        uint256 principal;          // Principal amount
        uint256 timeElapsed;        // Time elapsed since deposit
        uint256 annualRate;         // Annual percentage rate (APY)
        uint256 compoundFrequency;  // Compounding frequency per year
    }

    /// @notice Emitted when funds are deposited for yield generation
    /// @param poolId Associated pool identifier
    /// @param amount Amount deposited
    /// @param strategy Yield strategy used
    /// @param expectedYield Expected yield based on current rates
    event FundsStaked(
        uint256 indexed poolId,
        uint256 amount,
        YieldStrategy indexed strategy,
        uint256 expectedYield
    );

    /// @notice Emitted when funds are withdrawn from yield generation
    /// @param poolId Associated pool identifier
    /// @param principalAmount Original principal withdrawn
    /// @param yieldAmount Yield amount withdrawn
    /// @param totalAmount Total amount withdrawn
    event FundsWithdrawn(
        uint256 indexed poolId,
        uint256 principalAmount,
        uint256 yieldAmount,
        uint256 totalAmount
    );

    /// @notice Emitted when yield is updated for a pool
    /// @param poolId Associated pool identifier
    /// @param newYield Current yield amount
    /// @param totalValue Current total value
    /// @param yieldRate Current effective yield rate
    event YieldUpdated(
        uint256 indexed poolId,
        uint256 newYield,
        uint256 totalValue,
        uint256 yieldRate
    );

    /// @notice Emitted when yield strategy is changed
    /// @param poolId Associated pool identifier
    /// @param oldStrategy Previous strategy
    /// @param newStrategy New strategy
    event StrategyChanged(
        uint256 indexed poolId,
        YieldStrategy oldStrategy,
        YieldStrategy newStrategy
    );

    /// @notice Emitted when new yield strategy is added
    /// @param strategy Strategy type
    /// @param strategyAddress Implementation address
    /// @param expectedAPY Expected APY in basis points
    event StrategyAdded(
        YieldStrategy indexed strategy,
        address strategyAddress,
        uint256 expectedAPY
    );

    /// @notice Emitted when strategy configuration is updated
    /// @param strategy Strategy type
    /// @param newAPY New expected APY
    /// @param isActive New active status
    event StrategyUpdated(
        YieldStrategy indexed strategy,
        uint256 newAPY,
        bool isActive
    );

    /**
     * @notice Deposit funds for yield generation
     * @param poolId Identifier of the associated pool
     * @param strategy Yield strategy to use
     * @dev Transfers funds from pool and begins yield generation
     *      Records investment details for tracking
     */
    function deposit(uint256 poolId, YieldStrategy strategy) external payable;

    /**
     * @notice Withdraw all funds (principal + yield) for a pool
     * @param poolId Identifier of the pool
     * @return principal Original principal amount
     * @return yield Total yield generated
     * @dev Withdraws from underlying yield strategy and transfers to pool
     */
    function withdraw(uint256 poolId) external returns (uint256 principal, uint256 yield);

    /**
     * @notice Update yield calculation for a specific pool
     * @param poolId Identifier of the pool
     * @dev Syncs with underlying yield strategy to get current value
     *      Updates yield tracking without withdrawing funds
     */
    function updateYield(uint256 poolId) external;

    /**
     * @notice Batch update yield for multiple pools
     * @param poolIds Array of pool identifiers
     * @dev Efficient batch processing for yield updates
     */
    function batchUpdateYield(uint256[] calldata poolIds) external;

    /**
     * @notice Change yield strategy for a pool
     * @param poolId Identifier of the pool
     * @param newStrategy New yield strategy to use
     * @dev Withdraws from current strategy and deposits to new strategy
     *      Only callable by pool contract or admin
     */
    function changeStrategy(uint256 poolId, YieldStrategy newStrategy) external;

    /**
     * @notice Add new yield strategy
     * @param strategy Strategy type identifier
     * @param strategyInfo Strategy configuration
     * @dev Only callable by admin, adds new investment option
     */
    function addStrategy(YieldStrategy strategy, StrategyInfo calldata strategyInfo) external;

    /**
     * @notice Update existing yield strategy configuration
     * @param strategy Strategy type to update
     * @param strategyInfo New strategy configuration
     * @dev Only callable by admin
     */
    function updateStrategy(YieldStrategy strategy, StrategyInfo calldata strategyInfo) external;

    /**
     * @notice Enable or disable a yield strategy
     * @param strategy Strategy type
     * @param isActive New active status
     * @dev Allows admin to pause problematic strategies
     */
    function setStrategyActive(YieldStrategy strategy, bool isActive) external;

    /**
     * @notice Emergency withdrawal for admin
     * @param poolId Identifier of the pool
     * @dev Emergency function to recover funds in case of strategy issues
     */
    function emergencyWithdraw(uint256 poolId) external;

    /**
     * @notice Get current yield for a pool
     * @param poolId Identifier of the pool
     * @return currentYield Current yield amount generated
     */
    function getYield(uint256 poolId) external view returns (uint256 currentYield);

    /**
     * @notice Get total value (principal + yield) for a pool
     * @param poolId Identifier of the pool
     * @return totalValue Current total value
     */
    function getTotalValue(uint256 poolId) external view returns (uint256 totalValue);

    /**
     * @notice Get pool investment information
     * @param poolId Identifier of the pool
     * @return investment Complete investment information
     */
    function getPoolInvestment(uint256 poolId) external view returns (PoolInvestment memory investment);

    /**
     * @notice Get yield strategy information
     * @param strategy Strategy type
     * @return strategyInfo Complete strategy information
     */
    function getStrategyInfo(YieldStrategy strategy) external view returns (StrategyInfo memory strategyInfo);

    /**
     * @notice Get all active strategies
     * @return strategies Array of active strategy information
     */
    function getActiveStrategies() external view returns (StrategyInfo[] memory strategies);

    /**
     * @notice Calculate projected yield for given parameters
     * @param params Yield calculation parameters
     * @return projectedYield Calculated yield amount
     */
    function calculateProjectedYield(YieldParams calldata params) external pure returns (uint256 projectedYield);

    /**
     * @notice Calculate current APY for a pool
     * @param poolId Identifier of the pool
     * @return currentAPY Current annualized percentage yield
     */
    function getCurrentAPY(uint256 poolId) external view returns (uint256 currentAPY);

    /**
     * @notice Get best available strategy for a given amount
     * @param amount Investment amount
     * @return strategy Recommended strategy type
     * @return expectedYield Expected yield for the amount
     */
    function getBestStrategy(uint256 amount) external view returns (
        YieldStrategy strategy,
        uint256 expectedYield
    );

    /**
     * @notice Check if strategy is available for amount
     * @param strategy Strategy type to check
     * @param amount Investment amount
     * @return isAvailable True if strategy can accept the amount
     */
    function isStrategyAvailable(
        YieldStrategy strategy, 
        uint256 amount
    ) external view returns (bool isAvailable);

    /**
     * @notice Get total statistics across all strategies
     * @return totalInvested Total amount currently invested
     * @return totalYield Total yield generated across all pools
     * @return averageAPY Weighted average APY across strategies
     */
    function getTotalStats() external view returns (
        uint256 totalInvested,
        uint256 totalYield,
        uint256 averageAPY
    );

    /**
     * @notice Get strategy performance metrics
     * @param strategy Strategy type
     * @return totalDeposits Total deposits in strategy
     * @return totalYield Total yield generated
     * @return averageAPY Average APY performance
     * @return activeInvestments Number of active investments
     */
    function getStrategyPerformance(YieldStrategy strategy) external view returns (
        uint256 totalDeposits,
        uint256 totalYield,
        uint256 averageAPY,
        uint256 activeInvestments
    );
}
