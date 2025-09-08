// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title ILottery
 * @author Roca Team
 * @notice Interface for Roca lottery bonus system
 * @dev Manages weekly bonus draws and prize distribution for pool members
 */
interface ILottery {
    /// @notice Information about a lottery draw
    struct LotteryDraw {
        uint256 drawId;           // Unique identifier for the draw
        uint256 poolId;           // Associated pool identifier
        address winner;           // Address of the winner
        uint256 prizeAmount;      // Amount won in the draw
        uint256 drawTime;         // Timestamp of the draw
        uint256 totalParticipants; // Number of participants in draw
        bytes32 randomSeed;       // Random seed used for selection
        bool isPaidOut;           // Whether prize has been distributed
    }

    /// @notice Information about lottery configuration
    struct LotteryConfig {
        uint256 drawInterval;     // Time between draws in seconds
        uint256 prizePercentage;  // Percentage of pool yield allocated to prizes (basis points)
        uint256 minPoolSize;      // Minimum pool size to be eligible for lottery
        uint256 maxPrizeAmount;   // Maximum prize amount per draw
        bool isActive;            // Whether lottery system is active
    }

    /// @notice Participant information for a specific draw
    struct Participant {
        address participantAddress; // Address of participant
        uint256 weight;            // Weight in lottery (based on contribution/tenure)
        uint256 entries;           // Number of entries for this participant
        bool isEligible;          // Whether participant is eligible
    }

    /// @notice Emitted when a new lottery draw is requested
    /// @param drawId Unique identifier for the draw
    /// @param poolId Associated pool identifier
    /// @param prizeAmount Total prize amount for the draw
    /// @param participantCount Number of eligible participants
    event DrawRequested(
        uint256 indexed drawId, 
        uint256 indexed poolId, 
        uint256 prizeAmount, 
        uint256 participantCount
    );

    /// @notice Emitted when a lottery winner is selected
    /// @param drawId Unique identifier for the draw
    /// @param poolId Associated pool identifier
    /// @param winner Address of the selected winner
    /// @param prizeAmount Amount won by the winner
    /// @param randomSeed Random seed used for selection
    event BonusWinnerSelected(
        uint256 indexed drawId,
        uint256 indexed poolId,
        address indexed winner,
        uint256 prizeAmount,
        bytes32 randomSeed
    );

    /// @notice Emitted when prize is paid out to winner
    /// @param drawId Unique identifier for the draw
    /// @param winner Address of the winner
    /// @param amount Amount paid out
    event PrizePaidOut(uint256 indexed drawId, address indexed winner, uint256 amount);

    /// @notice Emitted when lottery configuration is updated
    /// @param drawInterval New draw interval
    /// @param prizePercentage New prize percentage
    /// @param minPoolSize New minimum pool size
    event LotteryConfigUpdated(
        uint256 drawInterval, 
        uint256 prizePercentage, 
        uint256 minPoolSize
    );

    /// @notice Emitted when a participant is added to lottery
    /// @param poolId Associated pool identifier
    /// @param participant Address of the participant
    /// @param weight Assigned weight for the participant
    event ParticipantAdded(uint256 indexed poolId, address indexed participant, uint256 weight);

    /// @notice Emitted when lottery is paused or unpaused
    /// @param isActive New active status
    event LotteryStatusChanged(bool isActive);

    /// @notice Emitted when badge contract address is updated
    /// @param oldBadgeContract Previous badge contract address
    /// @param newBadgeContract New badge contract address
    event BadgeContractUpdated(address indexed oldBadgeContract, address indexed newBadgeContract);

    /// @notice Emitted when badge minting fails for a lottery winner
    /// @param winner Address of the lottery winner
    /// @param poolId Associated pool identifier
    /// @param reason Failure reason (if available)
    event BadgeMintingFailed(address indexed winner, uint256 indexed poolId, string reason);

    /// @notice Emitted when emergency withdrawal is performed
    /// @param admin Address that performed the withdrawal
    /// @param amount Amount withdrawn
    event EmergencyWithdrawal(address indexed admin, uint256 amount);

    /**
     * @notice Request a lottery draw for a specific pool
     * @param poolId Identifier of the pool to draw for
     * @dev Can only be called by authorized contracts or admin
     *      Validates pool eligibility and calculates prize amount
     */
    function requestDraw(uint256 poolId, uint256 poolYield) external;

    /**
     * @notice Select winner for a pending lottery draw
     * @param drawId Identifier of the draw to complete
     * @dev Uses pseudo-random selection based on block hash and timestamp
     *      Weighted selection based on member contributions and tenure
     */
    function selectWinner(uint256 drawId) external;

    /**
     * @notice Distribute prize to lottery winner
     * @param drawId Identifier of the completed draw
     * @dev Transfers prize amount to winner's address
     *      Updates draw status to paid out
     */
    function distributePrize(uint256 drawId) external;

    /**
     * @notice Add participants for a pool to lottery system
     * @param poolId Identifier of the pool
     * @param participants Array of participant addresses
     * @param weights Array of weights for each participant
     * @dev Called when pool is locked to register eligible members
     */
    function addParticipants(
        uint256 poolId, 
        address[] calldata participants, 
        uint256[] calldata weights
    ) external;

    /**
     * @notice Remove participant from lottery (when member leaves pool)
     * @param poolId Identifier of the pool
     * @param participant Address of participant to remove
     * @dev Updates participant status and recalculates weights
     */
    function removeParticipant(uint256 poolId, address participant) external;

    /**
     * @notice Update lottery configuration parameters
     * @param config New lottery configuration
     * @dev Only callable by admin, validates configuration parameters
     */
    function updateLotteryConfig(LotteryConfig calldata config) external;

    /**
     * @notice Pause or unpause the lottery system
     * @param active New active status
     * @dev Emergency function to pause lottery in case of issues
     */
    function setLotteryActive(bool active) external;

    /**
     * @notice Calculate prize amount for a pool
     * @param poolId Identifier of the pool
     * @return prizeAmount Calculated prize amount based on pool yield
     */
    function calculatePrizeAmount(uint256 poolId, uint256 poolYield) external view returns (uint256 prizeAmount);

    /**
     * @notice Get lottery draw information
     * @param drawId Identifier of the draw
     * @return draw Complete draw information
     */
    function getDraw(uint256 drawId) external view returns (LotteryDraw memory draw);

    /**
     * @notice Get all draws for a specific pool
     * @param poolId Identifier of the pool
     * @return draws Array of draw information
     */
    function getPoolDraws(uint256 poolId) external view returns (LotteryDraw[] memory draws);

    /**
     * @notice Get lottery history for a participant
     * @param participant Address of the participant
     * @return draws Array of draws the participant was involved in
     */
    function getParticipantHistory(address participant) external view returns (LotteryDraw[] memory draws);

    /**
     * @notice Get current lottery configuration
     * @return config Current lottery configuration
     */
    function getLotteryConfig() external view returns (LotteryConfig memory config);

    /**
     * @notice Get participants for a specific pool
     * @param poolId Identifier of the pool
     * @return participants Array of participant information
     */
    function getPoolParticipants(uint256 poolId) external view returns (Participant[] memory participants);

    /**
     * @notice Check if a pool is eligible for lottery
     * @param poolId Identifier of the pool
     * @return isEligible True if pool meets lottery requirements
     */
    function isPoolEligible(uint256 poolId) external view returns (bool isEligible);

    /**
     * @notice Get next scheduled draw time for a pool
     * @param poolId Identifier of the pool
     * @return nextDrawTime Timestamp of next scheduled draw
     */
    function getNextDrawTime(uint256 poolId) external view returns (uint256 nextDrawTime);

    /**
     * @notice Get total prizes won by a participant
     * @param participant Address of the participant
     * @return totalPrizes Total amount won in all lotteries
     */
    function getTotalPrizesWon(address participant) external view returns (uint256 totalPrizes);

    /**
     * @notice Check if draw is ready for winner selection
     * @param drawId Identifier of the draw
     * @return isReady True if draw can proceed to winner selection
     */
    function isDrawReady(uint256 drawId) external view returns (bool isReady);

    /**
     * @notice Get lottery statistics for a pool
     * @param poolId Identifier of the pool
     * @return totalDraws Total number of draws for the pool
     * @return totalPrizes Total prizes distributed
     * @return lastDrawTime Timestamp of last draw
     */
    function getPoolLotteryStats(uint256 poolId) external view returns (
        uint256 totalDraws,
        uint256 totalPrizes,
        uint256 lastDrawTime
    );
}
