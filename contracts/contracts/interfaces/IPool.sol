// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IPool
 * @author Roca Team
 * @notice Interface for Roca savings pool contracts
 * @dev Defines the core functionality for decentralized social saving pools
 */
interface IPool {
    /// @notice Possible states of a savings pool
    enum PoolStatus {
        Open,      // Pool is accepting new members
        Locked,    // Pool is full and funds are being yielded
        Active,    // Pool is actively generating yield
        Completed  // Pool has finished and funds are distributed
    }

    /// @notice Information about a pool member
    struct PoolMember {
        address memberAddress;   // Address of the member
        uint256 contribution;    // Amount contributed by member
        uint256 joinedAt;       // Timestamp when member joined
        bool hasWithdrawn;      // Whether member has withdrawn their share
        uint256 yieldEarned;    // Total yield earned by this member
    }

    /// @notice Core pool information
    struct PoolInfo {
        address creator;           // Address of pool creator
        string name;              // Human-readable pool name
        uint256 contributionAmount; // Required contribution per member (in wei)
        uint256 maxMembers;       // Maximum number of members allowed
        uint256 duration;         // Duration of the pool in seconds
        PoolStatus status;        // Current status of the pool
        uint256 createdAt;        // Timestamp when pool was created
        uint256 lockedAt;         // Timestamp when pool was locked
        uint256 totalFunds;       // Total funds in the pool
        uint256 currentMembers;   // Current number of members
        address yieldManager;     // Address of yield management contract
    }

    /// @notice Emitted when a new member joins the pool
    /// @param member Address of the new member
    /// @param contribution Amount contributed by the member
    /// @param totalMembers Total number of members after joining
    event MemberJoined(address indexed member, uint256 contribution, uint256 totalMembers);

    /// @notice Emitted when a member leaves the pool (before lock)
    /// @param member Address of the member leaving
    /// @param refundAmount Amount refunded to the member
    event MemberLeft(address indexed member, uint256 refundAmount);

    /// @notice Emitted when the pool is locked and yield generation begins
    /// @param startTime Timestamp when the pool was locked
    /// @param totalFunds Total funds available for yield generation
    event PoolLocked(uint256 startTime, uint256 totalFunds);

    /// @notice Emitted when the pool is completed and ready for withdrawal
    /// @param totalYield Total yield generated during the pool duration
    /// @param finalAmount Final amount available for distribution
    event PoolCompleted(uint256 totalYield, uint256 finalAmount);

    /// @notice Emitted when a member withdraws their share
    /// @param member Address of the member withdrawing
    /// @param principal Original contribution amount
    /// @param yield Yield portion of the withdrawal
    /// @param totalAmount Total amount withdrawn
    event MemberWithdrawal(
        address indexed member, 
        uint256 principal, 
        uint256 yield, 
        uint256 totalAmount
    );

    /// @notice Emitted when yield is updated for the pool
    /// @param newYield Current total yield amount
    /// @param yieldRate Current annualized yield rate (basis points)
    event YieldUpdated(uint256 newYield, uint256 yieldRate);

    /**
     * @notice Join the savings pool by contributing the required amount
     * @dev Must send exact contribution amount. Pool must be in Open status.
     *      Automatically locks pool when max members is reached.
     */
    function joinPool() external payable;

    /**
     * @notice Leave the pool before it's locked (emergency exit)
     * @dev Can only be called when pool status is Open
     *      Returns full contribution to the member
     */
    function leavePool() external;

    /**
     * @notice Lock the pool and begin yield generation
     * @dev Can be called by creator when max members reached or manually
     *      Transfers funds to yield manager for investment
     */
    function lockPool() external;

    /**
     * @notice Complete the pool and prepare for fund distribution
     * @dev Called when pool duration expires or yield target is met
     *      Withdraws all funds from yield manager
     */
    function completePool() external;

    /**
     * @notice Withdraw member's share after pool completion
     * @dev Can only be called when pool status is Completed
     *      Calculates proportional share of principal + yield
     */
    function withdrawShare() external;

    /**
     * @notice Emergency withdrawal for specific member (admin only)
     * @param member Address of member to withdraw for
     * @dev Used in emergency situations or for inactive members
     */
    function emergencyWithdraw(address member) external;

    /**
     * @notice Update yield information from yield manager
     * @dev Called periodically to sync yield data
     *      Updates member yield allocations
     */
    function updateYield() external;

    /**
     * @notice Trigger automatic completion if conditions are met
     * @dev Can be called by anyone to trigger completion when time expires
     *      Gas-efficient way to ensure pools don't remain active indefinitely
     */
    function triggerCompletion() external;

    /**
     * @notice Get detailed information about the pool
     * @return info Complete pool information struct
     */
    function getPoolInfo() external view returns (PoolInfo memory info);

    /**
     * @notice Get information about a specific member
     * @param member Address of the member to query
     * @return memberInfo Complete member information struct
     */
    function getMemberInfo(address member) external view returns (PoolMember memory memberInfo);

    /**
     * @notice Get list of all pool members
     * @return members Array of member addresses
     */
    function getMembers() external view returns (address[] memory members);

    /**
     * @notice Check if an address is a member of the pool
     * @param account Address to check membership for
     * @return isMember True if address is a pool member
     */
    function isMember(address account) external view returns (bool isMember);

    /**
     * @notice Calculate current yield per member
     * @return yieldPerMember Current yield amount per member
     */
    function getYieldPerMember() external view returns (uint256 yieldPerMember);

    /**
     * @notice Get time remaining until pool completion
     * @return timeRemaining Seconds remaining, 0 if pool is completed
     */
    function getTimeRemaining() external view returns (uint256 timeRemaining);

    /**
     * @notice Get current total value of the pool (principal + yield)
     * @return totalValue Current total value in wei
     */
    function getTotalValue() external view returns (uint256 totalValue);

    /**
     * @notice Check if pool can be locked
     * @return canLock True if pool meets conditions for locking
     */
    function canLock() external view returns (bool canLock);

    /**
     * @notice Check if pool can be completed
     * @return canComplete True if pool meets conditions for completion
     */
    function canComplete() external view returns (bool canComplete);
}
