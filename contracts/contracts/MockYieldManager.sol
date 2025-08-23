// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./interfaces/IYieldManager.sol";

/**
 * @title MockYieldManager
 * @author Arisan+ Team
 * @notice Mock implementation of YieldManager for testing purposes
 * @dev Simulates yield generation without actual DeFi integration
 */
contract MockYieldManager is IYieldManager {
    /// @notice Mapping of pool IDs to deposited amounts
    mapping(uint256 => uint256) private _deposits;
    
    /// @notice Mapping of pool IDs to generated yield
    mapping(uint256 => uint256) private _yields;
    
    /// @notice Mapping of pool IDs to investment info
    mapping(uint256 => PoolInvestment) private _investments;
    
    /// @notice Mock strategy info
    StrategyInfo private _mockStrategy;
    
    /// @notice Fixed yield rate for testing (5% APY)
    uint256 public constant YIELD_RATE = 500; // 5% in basis points
    
    constructor() {
        _mockStrategy = StrategyInfo({
            strategyType: YieldStrategy.MockYield,
            name: "Mock Yield",
            description: "Mock yield strategy for testing",
            expectedAPY: YIELD_RATE,
            minDeposit: 0,
            maxDeposit: 0,
            lockPeriod: 0,
            isActive: true,
            strategyAddress: address(this),
            totalDeposited: 0,
            totalYieldGenerated: 0
        });
    }

    /**
     * @notice Deposit funds for yield generation
     * @param poolId Unique identifier for the pool
     * @param strategy Yield generation strategy to use
     */
    function deposit(uint256 poolId, YieldStrategy strategy) external payable override {
        _deposits[poolId] += msg.value;
        
        _investments[poolId] = PoolInvestment({
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
        
        _mockStrategy.totalDeposited += msg.value;
        
        emit FundsStaked(poolId, msg.value, strategy, 0);
    }

    /**
     * @notice Withdraw funds and generated yield
     * @param poolId Unique identifier for the pool
     * @return principal Original deposited amount
     * @return yield Generated yield amount
     */
    function withdraw(uint256 poolId) external override returns (uint256 principal, uint256 yield) {
        principal = _deposits[poolId];
        yield = _yields[poolId];
        
        uint256 totalAmount = principal + yield;
        
        // Reset deposits and yields
        _deposits[poolId] = 0;
        _yields[poolId] = 0;
        _investments[poolId].isActive = false;
        
        // Transfer back to pool
        if (totalAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
            require(success, "Transfer failed");
        }
        
        emit FundsWithdrawn(poolId, principal, yield, totalAmount);
    }

    // Implement all required view functions with simple returns
    function getYield(uint256 poolId) external view override returns (uint256 currentYield) {
        return _yields[poolId];
    }

    function getTotalValue(uint256 poolId) external view override returns (uint256 totalValue) {
        return _deposits[poolId] + _yields[poolId];
    }

    function getPoolInvestment(uint256 poolId) external view override returns (PoolInvestment memory investment) {
        return _investments[poolId];
    }

    function getStrategyInfo(YieldStrategy) external view override returns (StrategyInfo memory strategyInfo) {
        return _mockStrategy;
    }

    function getActiveStrategies() external view override returns (StrategyInfo[] memory strategies) {
        strategies = new StrategyInfo[](1);
        strategies[0] = _mockStrategy;
    }

    function calculateProjectedYield(YieldParams calldata params) external pure override returns (uint256 projectedYield) {
        // Simple calculation: (principal * rate * time) / (365 days * 10000 basis points)
        return (params.principal * params.annualRate * params.timeElapsed) / (365 days * 10000);
    }

    function getCurrentAPY(uint256) external pure override returns (uint256 currentAPY) {
        return YIELD_RATE;
    }

    function getBestStrategy(uint256 amount) external pure override returns (YieldStrategy strategy, uint256 expectedYield) {
        return (YieldStrategy.MockYield, amount * YIELD_RATE / 10000);
    }

    function isStrategyAvailable(YieldStrategy, uint256) external pure override returns (bool isAvailable) {
        return true;
    }

    function getTotalStats() external view override returns (uint256 totalInvested, uint256 totalYield, uint256 averageAPY) {
        return (_mockStrategy.totalDeposited, _mockStrategy.totalYieldGenerated, YIELD_RATE);
    }

    function getStrategyPerformance(YieldStrategy) external view override returns (
        uint256 totalDeposits,
        uint256 totalYield,
        uint256 averageAPY,
        uint256 activeInvestments
    ) {
        return (_mockStrategy.totalDeposited, _mockStrategy.totalYieldGenerated, YIELD_RATE, 0);
    }

    // Functions that modify state but aren't essential for basic testing
    function updateYield(uint256 poolId) external override {
        // Simple yield update - add 1% of principal as yield
        uint256 newYield = _deposits[poolId] / 100;
        _yields[poolId] += newYield;
        _investments[poolId].yieldGenerated += newYield;
        _investments[poolId].currentValue += newYield;
        _investments[poolId].lastYieldUpdate = block.timestamp;
        
        emit YieldUpdated(poolId, _yields[poolId], _deposits[poolId] + _yields[poolId], YIELD_RATE);
    }

    function batchUpdateYield(uint256[] calldata poolIds) external override {
        for (uint256 i = 0; i < poolIds.length; i++) {
            this.updateYield(poolIds[i]);
        }
    }

    function changeStrategy(uint256, YieldStrategy) external pure override {
        // Not implemented for mock
        revert("Not implemented in mock");
    }

    function addStrategy(YieldStrategy, StrategyInfo calldata) external pure override {
        // Not implemented for mock
        revert("Not implemented in mock");
    }

    function updateStrategy(YieldStrategy, StrategyInfo calldata) external pure override {
        // Not implemented for mock
        revert("Not implemented in mock");
    }

    function setStrategyActive(YieldStrategy, bool) external pure override {
        // Not implemented for mock
        revert("Not implemented in mock");
    }

    function emergencyWithdraw(uint256) external pure override {
        // Not implemented for mock
        revert("Not implemented in mock");
    }

    /**
     * @notice Update yield for a specific pool (helper for testing)
     * @param poolId Pool to update yield for
     * @param newYield New yield amount to add
     */
    function addYield(uint256 poolId, uint256 newYield) external {
        _yields[poolId] += newYield;
        _investments[poolId].yieldGenerated += newYield;
        _investments[poolId].currentValue += newYield;
        _mockStrategy.totalYieldGenerated += newYield;
    }

    /**
     * @notice Get deposited amount for a pool
     * @param poolId Pool ID to query
     * @return amount Deposited amount
     */
    function getDeposits(uint256 poolId) external view returns (uint256 amount) {
        return _deposits[poolId];
    }

    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}
