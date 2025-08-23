// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ILottery.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IYieldManager.sol";
import "./interfaces/IBadge.sol";

/**
 * @title LotteryManager
 * @author Arisan+ Team
 * @notice Implementation of Arisan+ lottery bonus system with pseudo-randomness
 * @dev Manages weekly bonus draws and prize distribution for pool members using block hash for MVP
 */
contract LotteryManager is ILottery, AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role identifier for pool contracts
    bytes32 public constant POOL_ROLE = keccak256("POOL_ROLE");
    
    /// @notice Role identifier for lottery admin
    bytes32 public constant LOTTERY_ADMIN_ROLE = keccak256("LOTTERY_ADMIN_ROLE");

    /// @notice Current lottery configuration
    LotteryConfig private _config;
    
    /// @notice Counter for draw IDs
    uint256 private _nextDrawId;
    
    /// @notice Mapping from draw ID to draw information
    mapping(uint256 => LotteryDraw) private _draws;
    
    /// @notice Mapping from pool ID to list of draw IDs
    mapping(uint256 => uint256[]) private _poolDraws;
    
    /// @notice Mapping from pool ID to participant information
    mapping(uint256 => Participant[]) private _poolParticipants;
    
    /// @notice Mapping from participant address to total prizes won
    mapping(address => uint256) private _totalPrizesWon;
    
    /// @notice Mapping from pool ID to last draw time
    mapping(uint256 => uint256) private _lastDrawTime;

    /// @notice Address of the badge NFT contract
    address private _badgeContract;

    /// @notice Custom errors for gas efficiency
    error DrawNotFound(uint256 drawId);
    error DrawAlreadyCompleted(uint256 drawId);
    error DrawNotReady(uint256 drawId);
    error PoolNotEligible(uint256 poolId);
    error InvalidConfiguration();
    error InsufficientPrizePool();
    error TransferFailed();
    error ParticipantNotFound();
    error EmptyParticipantList();
    error ArrayLengthMismatch();

    /// @notice Additional events for enhanced lottery functionality
    event PrizePoolFunded(uint256 indexed poolId, uint256 amount, uint256 totalBalance);
    event YieldFundingRequested(uint256 indexed poolId, uint256 amount);

    /**
     * @notice Constructor initializes the lottery manager with default configuration
     * @param admin Address of the initial admin
     * @param badgeContract Address of the badge NFT contract (can be zero to disable)
     */
    constructor(address admin, address badgeContract) {
        if (admin == address(0)) revert InvalidConfiguration();
        
        // Validate badge contract if not zero address
        if (badgeContract != address(0)) {
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(badgeContract)
            }
            if (codeSize == 0) revert InvalidConfiguration();
        }
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOTTERY_ADMIN_ROLE, admin);
        
        // Store badge contract address
        _badgeContract = badgeContract;
        
        // Set default configuration
        _config = LotteryConfig({
            drawInterval: 7 days,           // Weekly draws
            prizePercentage: 1000,          // 10% of pool yield (1000 basis points)
            minPoolSize: 5,                 // Minimum 5 members
            maxPrizeAmount: 10 ether,       // Maximum 10 ETH prize
            isActive: true                  // Active by default
        });
        
        _nextDrawId = 1;
    }

    /**
     * @notice Request a lottery draw for a specific pool
     * @param poolId Identifier of the pool to draw for
     * @param poolYield Current total yield of the pool
     * @dev Can only be called by authorized pool contracts
     *      Validates pool eligibility and calculates prize amount
     */
    function requestDraw(uint256 poolId, uint256 poolYield) external override onlyRole(POOL_ROLE) whenNotPaused {
        if (!_config.isActive) revert PoolNotEligible(poolId);
        if (!isPoolEligible(poolId)) revert PoolNotEligible(poolId);
        
        // Check if enough time has passed since last draw
        uint256 lastDraw = _lastDrawTime[poolId];
        if (lastDraw > 0 && block.timestamp < lastDraw + _config.drawInterval) {
            revert DrawNotReady(_nextDrawId);
        }
        
        uint256 prizeAmount = calculatePrizeAmount(poolId, poolYield);
        if (prizeAmount == 0) revert InsufficientPrizePool();
        
        uint256 participantCount = _poolParticipants[poolId].length;
        if (participantCount == 0) revert EmptyParticipantList();
        
        // Create new draw
        LotteryDraw memory newDraw = LotteryDraw({
            drawId: _nextDrawId,
            poolId: poolId,
            winner: address(0),
            prizeAmount: prizeAmount,
            drawTime: block.timestamp,
            totalParticipants: participantCount,
            randomSeed: bytes32(0),
            isPaidOut: false
        });
        
        _draws[_nextDrawId] = newDraw;
        _poolDraws[poolId].push(_nextDrawId);
        _lastDrawTime[poolId] = block.timestamp;
        
        emit DrawRequested(_nextDrawId, poolId, prizeAmount, participantCount);
        
        _nextDrawId++;
    }

    /**
     * @notice Select winner for a pending lottery draw
     * @param drawId Identifier of the draw to complete
     * @dev Uses pseudo-random selection based on block hash and timestamp
     *      Weighted selection based on member contributions and tenure
     */
    function selectWinner(uint256 drawId) external override nonReentrant whenNotPaused {
        LotteryDraw storage draw = _draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound(drawId);
        if (draw.winner != address(0)) revert DrawAlreadyCompleted(drawId);
        
        // Must wait at least 1 block for proper randomness
        if (draw.drawTime >= block.timestamp) revert DrawNotReady(drawId);
        
        Participant[] storage participants = _poolParticipants[draw.poolId];
        if (participants.length == 0) revert EmptyParticipantList();
        
        // Generate pseudo-random seed using block hash and other entropy sources
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            block.prevrandao,
            draw.drawId,
            draw.poolId,
            participants.length
        ));
        
        // Calculate total weight for weighted selection
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].isEligible) {
                totalWeight += participants[i].weight;
            }
        }
        
        if (totalWeight == 0) revert EmptyParticipantList();
        
        // Select winner based on weighted probability
        uint256 randomValue = uint256(randomSeed) % totalWeight;
        uint256 currentWeight = 0;
        address winner = address(0);
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].isEligible) {
                currentWeight += participants[i].weight;
                if (randomValue < currentWeight) {
                    winner = participants[i].participantAddress;
                    break;
                }
            }
        }
        
        // Update draw with winner information
        draw.winner = winner;
        draw.randomSeed = randomSeed;
        
        // Update participant's total prizes
        _totalPrizesWon[winner] += draw.prizeAmount;
        
        // Mint LotteryWinner badge for the winner
        _mintWinnerBadge(winner, draw.poolId, draw.prizeAmount);
        
        emit BonusWinnerSelected(drawId, draw.poolId, winner, draw.prizeAmount, randomSeed);
    }

    /**
     * @notice Distribute prize to lottery winner
     * @param drawId Identifier of the completed draw
     * @dev Transfers prize amount to winner's address
     *      Updates draw status to paid out
     */
    function distributePrize(uint256 drawId) external override nonReentrant whenNotPaused {
        LotteryDraw storage draw = _draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound(drawId);
        if (draw.winner == address(0)) revert DrawNotReady(drawId);
        if (draw.isPaidOut) revert DrawAlreadyCompleted(drawId);
        
        // Check contract has sufficient balance
        if (address(this).balance < draw.prizeAmount) revert InsufficientPrizePool();
        
        draw.isPaidOut = true;
        
        // Transfer prize to winner
        (bool success, ) = draw.winner.call{value: draw.prizeAmount}("");
        if (!success) revert TransferFailed();
        
        emit PrizePaidOut(drawId, draw.winner, draw.prizeAmount);
    }

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
    ) external override onlyRole(POOL_ROLE) {
        if (participants.length != weights.length) revert ArrayLengthMismatch();
        if (participants.length == 0) revert EmptyParticipantList();
        
        // Clear existing participants for this pool
        delete _poolParticipants[poolId];
        
        // Add new participants
        for (uint256 i = 0; i < participants.length; i++) {
            _poolParticipants[poolId].push(Participant({
                participantAddress: participants[i],
                weight: weights[i],
                entries: weights[i], // For MVP, entries equal weight
                isEligible: true
            }));
            
            emit ParticipantAdded(poolId, participants[i], weights[i]);
        }
    }

    /**
     * @notice Remove participant from lottery (when member leaves pool)
     * @param poolId Identifier of the pool
     * @param participant Address of participant to remove
     * @dev Updates participant status and recalculates weights
     */
    function removeParticipant(uint256 poolId, address participant) external override onlyRole(POOL_ROLE) {
        Participant[] storage participants = _poolParticipants[poolId];
        bool found = false;
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].participantAddress == participant) {
                participants[i].isEligible = false;
                found = true;
                break;
            }
        }
        
        if (!found) revert ParticipantNotFound();
    }

    /**
     * @notice Update lottery configuration parameters
     * @param config New lottery configuration
     * @dev Only callable by admin, validates configuration parameters
     */
    function updateLotteryConfig(LotteryConfig calldata config) external override onlyRole(LOTTERY_ADMIN_ROLE) {
        if (config.drawInterval == 0 || config.drawInterval > 30 days) revert InvalidConfiguration();
        if (config.prizePercentage > 5000) revert InvalidConfiguration(); // Max 50%
        if (config.minPoolSize == 0 || config.minPoolSize > 1000) revert InvalidConfiguration();
        
        _config = config;
        
        emit LotteryConfigUpdated(
            config.drawInterval,
            config.prizePercentage,
            config.minPoolSize
        );
    }

    /**
     * @notice Pause or unpause the lottery system
     * @param active New active status
     * @dev Emergency function to pause lottery in case of issues
     */
    function setLotteryActive(bool active) external override onlyRole(LOTTERY_ADMIN_ROLE) {
        _config.isActive = active;
        emit LotteryStatusChanged(active);
    }

    /**
     * @notice Calculate prize amount for a pool based on 10% of weekly yield
     * @param poolId Identifier of the pool
     * @param poolYield Current total yield of the pool
     * @return prizeAmount Calculated prize amount based on pool yield
     */
    function calculatePrizeAmount(uint256 poolId, uint256 poolYield) public view override returns (uint256 prizeAmount) {
        // Use provided pool yield for calculation
        if (poolYield > 0) {
            // Calculate 10% of yield as prize
            prizeAmount = (poolYield * _config.prizePercentage) / 10000;
            
            // Cap by maximum prize amount
            if (prizeAmount > _config.maxPrizeAmount) {
                prizeAmount = _config.maxPrizeAmount;
            }
            
            return prizeAmount;
        }
        
        // Fallback MVP calculation based on pool size if no yield
        uint256 participantCount = _poolParticipants[poolId].length;
        if (participantCount == 0) return 0;
        
        // Base prize: 0.01 ETH per participant, adjusted by prize percentage
        prizeAmount = (participantCount * 0.01 ether * _config.prizePercentage) / 10000;
        
        if (prizeAmount > _config.maxPrizeAmount) {
            prizeAmount = _config.maxPrizeAmount;
        }
        
        return prizeAmount;
    }

    /**
     * @notice Get lottery draw information
     * @param drawId Identifier of the draw
     * @return draw Complete draw information
     */
    function getDraw(uint256 drawId) external view override returns (LotteryDraw memory draw) {
        return _draws[drawId];
    }

    /**
     * @notice Get all draws for a specific pool
     * @param poolId Identifier of the pool
     * @return draws Array of draw information
     */
    function getPoolDraws(uint256 poolId) external view override returns (LotteryDraw[] memory draws) {
        uint256[] storage drawIds = _poolDraws[poolId];
        draws = new LotteryDraw[](drawIds.length);
        
        for (uint256 i = 0; i < drawIds.length; i++) {
            draws[i] = _draws[drawIds[i]];
        }
        
        return draws;
    }

    /**
     * @notice Get lottery history for a participant
     * @param participant Address of the participant
     * @return draws Array of draws the participant was involved in
     */
    function getParticipantHistory(address participant) external view override returns (LotteryDraw[] memory draws) {
        // Count total draws for this participant
        uint256 totalCount = 0;
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            if (_isParticipantInDraw(participant, drawId)) {
                totalCount++;
            }
        }
        
        // Create array and populate
        draws = new LotteryDraw[](totalCount);
        uint256 index = 0;
        
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            if (_isParticipantInDraw(participant, drawId)) {
                draws[index] = _draws[drawId];
                index++;
            }
        }
        
        return draws;
    }

    /**
     * @notice Get current lottery configuration
     * @return config Current lottery configuration
     */
    function getLotteryConfig() external view override returns (LotteryConfig memory config) {
        return _config;
    }

    /**
     * @notice Get participants for a specific pool
     * @param poolId Identifier of the pool
     * @return participants Array of participant information
     */
    function getPoolParticipants(uint256 poolId) external view override returns (Participant[] memory participants) {
        return _poolParticipants[poolId];
    }

    /**
     * @notice Check if a pool is eligible for lottery
     * @param poolId Identifier of the pool
     * @return isEligible True if pool meets lottery requirements
     */
    function isPoolEligible(uint256 poolId) public view override returns (bool isEligible) {
        if (!_config.isActive) return false;
        
        uint256 participantCount = _poolParticipants[poolId].length;
        return participantCount >= _config.minPoolSize;
    }

    /**
     * @notice Get next scheduled draw time for a pool
     * @param poolId Identifier of the pool
     * @return nextDrawTime Timestamp of next scheduled draw
     */
    function getNextDrawTime(uint256 poolId) external view override returns (uint256 nextDrawTime) {
        uint256 lastDraw = _lastDrawTime[poolId];
        if (lastDraw == 0) {
            return block.timestamp; // First draw can happen immediately
        }
        return lastDraw + _config.drawInterval;
    }

    /**
     * @notice Get total prizes won by a participant
     * @param participant Address of the participant
     * @return totalPrizes Total amount won in all lotteries
     */
    function getTotalPrizesWon(address participant) external view override returns (uint256 totalPrizes) {
        return _totalPrizesWon[participant];
    }

    /**
     * @notice Check if draw is ready for winner selection
     * @param drawId Identifier of the draw
     * @return isReady True if draw can proceed to winner selection
     */
    function isDrawReady(uint256 drawId) external view override returns (bool isReady) {
        LotteryDraw storage draw = _draws[drawId];
        if (draw.drawId == 0) return false;
        if (draw.winner != address(0)) return false;
        
        // Must wait at least 1 block for proper randomness
        return draw.drawTime < block.timestamp;
    }

    /**
     * @notice Get lottery statistics for a pool
     * @param poolId Identifier of the pool
     * @return totalDraws Total number of draws for the pool
     * @return totalPrizes Total prizes distributed
     * @return lastDrawTime Timestamp of last draw
     */
    function getPoolLotteryStats(uint256 poolId) external view override returns (
        uint256 totalDraws,
        uint256 totalPrizes,
        uint256 lastDrawTime
    ) {
        uint256[] storage drawIds = _poolDraws[poolId];
        totalDraws = drawIds.length;
        
        totalPrizes = 0;
        for (uint256 i = 0; i < drawIds.length; i++) {
            LotteryDraw storage draw = _draws[drawIds[i]];
            if (draw.isPaidOut) {
                totalPrizes += draw.prizeAmount;
            }
        }
        
        lastDrawTime = _lastDrawTime[poolId];
        
        return (totalDraws, totalPrizes, lastDrawTime);
    }

    /**
     * @notice Get comprehensive lottery history for a participant
     * @param participant Address of the participant
     * @return draws Array of draws the participant was involved in
     * @return totalWon Total amount won by participant across all lotteries
     * @return winCount Number of times participant has won
     * @return participationCount Total number of draws participated in
     */
    function getDetailedParticipantHistory(address participant) external view returns (
        LotteryDraw[] memory draws,
        uint256 totalWon,
        uint256 winCount,
        uint256 participationCount
    ) {
        // First pass: count draws this participant was involved in
        uint256 totalCount = 0;
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            if (_isParticipantInDraw(participant, drawId)) {
                totalCount++;
            }
        }
        
        // Create array and populate with detailed information
        draws = new LotteryDraw[](totalCount);
        uint256 index = 0;
        totalWon = 0;
        winCount = 0;
        
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            if (_isParticipantInDraw(participant, drawId)) {
                draws[index] = _draws[drawId];
                
                // Check if participant was the winner
                if (_draws[drawId].winner == participant && _draws[drawId].isPaidOut) {
                    totalWon += _draws[drawId].prizeAmount;
                    winCount++;
                }
                
                index++;
            }
        }
        
        participationCount = totalCount;
        
        return (draws, totalWon, winCount, participationCount);
    }

    /**
     * @notice Get lottery leaderboard (top winners)
     * @param limit Maximum number of winners to return
     * @return winners Array of winner addresses
     * @return amounts Array of total amounts won
     */
    function getLotteryLeaderboard(uint256 limit) external view returns (
        address[] memory winners,
        uint256[] memory amounts
    ) {
        // Get all unique winners and their totals
        address[] memory allWinners = new address[](_nextDrawId);
        uint256[] memory winnerAmounts = new uint256[](_nextDrawId);
        uint256 winnerCount = 0;
        
        // Collect all winners
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            LotteryDraw storage draw = _draws[drawId];
            if (draw.winner != address(0) && draw.isPaidOut) {
                // Check if winner already exists in our array
                bool found = false;
                for (uint256 i = 0; i < winnerCount; i++) {
                    if (allWinners[i] == draw.winner) {
                        winnerAmounts[i] += draw.prizeAmount;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    allWinners[winnerCount] = draw.winner;
                    winnerAmounts[winnerCount] = draw.prizeAmount;
                    winnerCount++;
                }
            }
        }
        
        // Sort winners by amount (simple bubble sort for small datasets)
        for (uint256 i = 0; i < winnerCount; i++) {
            for (uint256 j = i + 1; j < winnerCount; j++) {
                if (winnerAmounts[i] < winnerAmounts[j]) {
                    // Swap amounts
                    uint256 tempAmount = winnerAmounts[i];
                    winnerAmounts[i] = winnerAmounts[j];
                    winnerAmounts[j] = tempAmount;
                    
                    // Swap addresses
                    address tempWinner = allWinners[i];
                    allWinners[i] = allWinners[j];
                    allWinners[j] = tempWinner;
                }
            }
        }
        
        // Return top winners up to limit
        uint256 resultCount = winnerCount < limit ? winnerCount : limit;
        winners = new address[](resultCount);
        amounts = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            winners[i] = allWinners[i];
            amounts[i] = winnerAmounts[i];
        }
        
        return (winners, amounts);
    }

    /**
     * @notice Get all draws within a time range
     * @param startTime Start timestamp (inclusive)
     * @param endTime End timestamp (inclusive)
     * @return draws Array of draws within the time range
     */
    function getDrawsByTimeRange(uint256 startTime, uint256 endTime) external view returns (
        LotteryDraw[] memory draws
    ) {
        // First pass: count draws in range
        uint256 count = 0;
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            LotteryDraw storage draw = _draws[drawId];
            if (draw.drawTime >= startTime && draw.drawTime <= endTime) {
                count++;
            }
        }
        
        // Create array and populate
        draws = new LotteryDraw[](count);
        uint256 index = 0;
        
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            LotteryDraw storage draw = _draws[drawId];
            if (draw.drawTime >= startTime && draw.drawTime <= endTime) {
                draws[index] = draw;
                index++;
            }
        }
        
        return draws;
    }

    /**
     * @notice Get global lottery statistics
     * @return totalDraws Total number of draws across all pools
     * @return totalPrizesDistributed Total amount of prizes distributed
     * @return totalParticipants Total unique participants across all lotteries
     * @return averagePrizeAmount Average prize amount across all draws
     */
    function getGlobalLotteryStats() external view returns (
        uint256 totalDraws,
        uint256 totalPrizesDistributed,
        uint256 totalParticipants,
        uint256 averagePrizeAmount
    ) {
        totalDraws = _nextDrawId - 1;
        totalPrizesDistributed = 0;
        uint256 paidDraws = 0;
        
        // Count unique participants using a simple approach
        address[] memory uniqueParticipants = new address[](totalDraws * 10); // Rough estimate
        uint256 uniqueCount = 0;
        
        for (uint256 drawId = 1; drawId < _nextDrawId; drawId++) {
            LotteryDraw storage draw = _draws[drawId];
            
            if (draw.isPaidOut) {
                totalPrizesDistributed += draw.prizeAmount;
                paidDraws++;
            }
            
            // Add participants to unique list
            Participant[] storage participants = _poolParticipants[draw.poolId];
            for (uint256 i = 0; i < participants.length; i++) {
                address participant = participants[i].participantAddress;
                bool found = false;
                
                for (uint256 j = 0; j < uniqueCount; j++) {
                    if (uniqueParticipants[j] == participant) {
                        found = true;
                        break;
                    }
                }
                
                if (!found && uniqueCount < uniqueParticipants.length) {
                    uniqueParticipants[uniqueCount] = participant;
                    uniqueCount++;
                }
            }
        }
        
        totalParticipants = uniqueCount;
        averagePrizeAmount = paidDraws > 0 ? totalPrizesDistributed / paidDraws : 0;
        
        return (totalDraws, totalPrizesDistributed, totalParticipants, averagePrizeAmount);
    }

    /**
     * @notice Check if participant was involved in a specific draw
     * @param participant Address of the participant
     * @param drawId Identifier of the draw
     * @return involved True if participant was in the draw
     */
    function _isParticipantInDraw(address participant, uint256 drawId) internal view returns (bool involved) {
        LotteryDraw storage draw = _draws[drawId];
        if (draw.drawId == 0) return false;
        
        Participant[] storage participants = _poolParticipants[draw.poolId];
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].participantAddress == participant) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @notice Emergency function to pause all lottery operations
     * @dev Only callable by admin in case of critical issues
     */
    function emergencyPause() external onlyRole(LOTTERY_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Emergency function to unpause lottery operations
     * @dev Only callable by admin after issues are resolved
     */
    function emergencyUnpause() external onlyRole(LOTTERY_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Fund the lottery prize pool from yield
     * @param poolId Identifier of the pool contributing yield
     * @dev This function should be called by pools when distributing yield
     *      to fund future lottery prizes
     */
    function fundPrizePool(uint256 poolId) external payable onlyRole(POOL_ROLE) {
        if (msg.value == 0) return;
        
        // Contract receives the ETH automatically
        emit PrizePoolFunded(poolId, msg.value, address(this).balance);
    }

    /**
     * @notice Automatic prize distribution with yield integration
     * @param drawId Identifier of the completed draw
     * @dev Enhanced version that can request yield funding if needed
     */
    function distributePrizeWithYieldCheck(uint256 drawId) external nonReentrant whenNotPaused {
        LotteryDraw storage draw = _draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound(drawId);
        if (draw.winner == address(0)) revert DrawNotReady(drawId);
        if (draw.isPaidOut) revert DrawAlreadyCompleted(drawId);
        
        // Check if contract has sufficient balance
        if (address(this).balance < draw.prizeAmount) {
            // Try to request funding from the pool's yield
            _requestYieldFunding(draw.poolId, draw.prizeAmount);
            
            // Check again after funding attempt
            if (address(this).balance < draw.prizeAmount) {
                revert InsufficientPrizePool();
            }
        }
        
        draw.isPaidOut = true;
        
        // Transfer prize to winner
        (bool success, ) = draw.winner.call{value: draw.prizeAmount}("");
        if (!success) {
            draw.isPaidOut = false; // Revert state on failed transfer
            revert TransferFailed();
        }
        
        emit PrizePaidOut(drawId, draw.winner, draw.prizeAmount);
    }

    /**
     * @notice Request yield funding from pool for lottery prizes
     * @param poolId Identifier of the pool
     * @param amount Amount needed for prizes
     * @dev Internal function to request yield contribution for lottery funding
     */
    function _requestYieldFunding(uint256 poolId, uint256 amount) internal {
        // This is a simplified implementation
        // In a full production system, this would interact with the pool
        // to request a portion of yield for lottery funding
        
        // For now, we emit an event that pools can listen to
        emit YieldFundingRequested(poolId, amount);
    }

    /**
     * @notice Batch process multiple lottery draws
     * @param drawIds Array of draw IDs to process
     * @dev Efficiently processes multiple draws in a single transaction
     */
    function batchProcessDraws(uint256[] calldata drawIds) external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < drawIds.length; i++) {
            uint256 drawId = drawIds[i];
            LotteryDraw storage draw = _draws[drawId];
            
            // Skip invalid or completed draws
            if (draw.drawId == 0 || draw.isPaidOut) continue;
            
            // Select winner if not already selected
            if (draw.winner == address(0)) {
                // Must wait at least 1 block for proper randomness
                if (draw.drawTime < block.timestamp) {
                    _selectWinnerInternal(drawId);
                }
            }
            
            // Distribute prize if winner is selected and funds available
            if (draw.winner != address(0) && address(this).balance >= draw.prizeAmount) {
                draw.isPaidOut = true;
                
                (bool success, ) = draw.winner.call{value: draw.prizeAmount}("");
                if (success) {
                    emit PrizePaidOut(drawId, draw.winner, draw.prizeAmount);
                } else {
                    draw.isPaidOut = false; // Revert on failed transfer
                }
            }
        }
    }

    /**
     * @notice Internal function to select winner (extracted for reuse)
     * @param drawId Identifier of the draw
     */
    function _selectWinnerInternal(uint256 drawId) internal {
        LotteryDraw storage draw = _draws[drawId];
        Participant[] storage participants = _poolParticipants[draw.poolId];
        
        if (participants.length == 0) return;
        
        // Generate pseudo-random seed
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            block.prevrandao,
            drawId,
            draw.poolId,
            participants.length
        ));
        
        // Calculate total weight for weighted selection
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].isEligible) {
                totalWeight += participants[i].weight;
            }
        }
        
        if (totalWeight == 0) return;
        
        // Select winner based on weighted probability
        uint256 randomValue = uint256(randomSeed) % totalWeight;
        uint256 currentWeight = 0;
        address winner = address(0);
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].isEligible) {
                currentWeight += participants[i].weight;
                if (randomValue < currentWeight) {
                    winner = participants[i].participantAddress;
                    break;
                }
            }
        }
        
        // Update draw with winner information
        draw.winner = winner;
        draw.randomSeed = randomSeed;
        
        // Update participant's total prizes
        _totalPrizesWon[winner] += draw.prizeAmount;
        
        // Mint LotteryWinner badge for the winner
        _mintWinnerBadge(winner, draw.poolId, draw.prizeAmount);
        
        emit BonusWinnerSelected(drawId, draw.poolId, winner, draw.prizeAmount, randomSeed);
    }

    /**
     * @notice Check if badge contract is valid and ready for operations
     * @return isValid True if badge contract is available and functional
     */
    function _isBadgeContractValid() internal view returns (bool isValid) {
        if (_badgeContract == address(0)) return false;
        
        // Check if badge contract address has code (is a contract)
        address badgeAddr = _badgeContract;
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(badgeAddr)
        }
        return codeSize > 0;
    }

    /**
     * @notice Mint LotteryWinner badge for lottery winner
     * @param winner Address of the lottery winner
     * @param poolId Associated pool identifier
     * @param prizeAmount Prize amount won
     * @dev This function is called when a winner is selected to mint their lottery winner badge
     *      Badge minting failures will not revert the lottery operation to ensure core functionality
     */
    function _mintWinnerBadge(address winner, uint256 poolId, uint256 prizeAmount) internal {
        // Input validation
        if (winner == address(0)) return; // Skip for zero address
        if (!_isBadgeContractValid()) return; // Skip if badge contract not configured or invalid
        
        // Prepare badge metadata with comprehensive information
        bytes memory badgeMetadata = abi.encode(
            "Lottery Winner",
            block.timestamp,
            prizeAmount,
            poolId,
            block.number
        );
        
        // Use low-level call for better error handling and gas efficiency
        (bool success, bytes memory data) = _badgeContract.call(
            abi.encodeWithSelector(
                IBadge.mintBadge.selector,
                winner,
                IBadge.BadgeType.LotteryWinner,
                poolId,
                prizeAmount,
                badgeMetadata
            )
        );
        
        // Log badge minting failure for debugging without reverting lottery operation
        if (!success) {
            // Decode error message for more informative logging
            string memory failureReason = "Unknown error";
            if (data.length >= 68) {
                // Extract revert reason from returndata
                assembly {
                    // Skip the first 68 bytes (4 bytes selector + 32 bytes offset + 32 bytes length)
                    let reasonPtr := add(data, 0x44)
                    let reasonLength := mload(add(data, 0x24))
                    failureReason := reasonPtr
                    mstore(failureReason, reasonLength)
                }
            }
            
            // Emit dedicated event for badge minting failure
            emit BadgeMintingFailed(winner, poolId, failureReason);
        }
    }

    /**
     * @notice Get the badge contract address
     * @return badgeContract Address of the badge NFT contract
     */
    function getBadgeContract() external view returns (address badgeContract) {
        return _badgeContract;
    }

    /**
     * @notice Set the badge contract address (admin only)
     * @param badgeContract New badge contract address
     * @dev Validates that the new address is either zero (to disable badges) or a valid contract
     */
    function setBadgeContract(address badgeContract) external onlyRole(LOTTERY_ADMIN_ROLE) {
        address oldBadgeContract = _badgeContract;
        
        // Allow setting to zero address to disable badge functionality
        if (badgeContract != address(0)) {
            // Validate that the address contains contract code
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(badgeContract)
            }
            if (codeSize == 0) revert InvalidConfiguration();
        }
        
        _badgeContract = badgeContract;
        
        // Emit dedicated event for badge contract changes
        emit BadgeContractUpdated(oldBadgeContract, badgeContract);
    }

    /**
     * @notice Allow contract to receive ETH for prize distribution
     * @dev Required for receiving funds from pools or external sources
     */
    receive() external payable {
        // Contract can receive ETH for prize pool funding
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        // Fallback to receive function
    }

    /**
     * @notice Emergency withdrawal function (admin only)
     * @param amount Amount to withdraw
     * @dev Only for emergency situations, not normal operations
     */
    function emergencyWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert InvalidConfiguration();
        if (amount > address(this).balance) revert InsufficientPrizePool();
        
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit EmergencyWithdrawal(msg.sender, amount);
    }
}
