// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IYieldManager.sol";
import "./interfaces/IBadge.sol";
import "./interfaces/ILottery.sol";

/**
 * @title IPoolFactory
 * @notice Interface to interact with PoolFactory for getting poolId and badge minting
 */
interface IPoolFactory {
    function getPoolId(address poolAddress) external view returns (uint256 poolId);
    function mintPoolCreatorBadge(address creator, uint256 poolId, uint256 contributionAmount) external;
    function mintPoolMemberBadge(address member, uint256 poolId, uint256 contribution) external;
    function mintPoolCompletionBadges(address[] memory members, uint256 poolId, uint256 totalYield) external;
}

/**
 * @title Pool
 * @author Arisan+ Team
 * @notice Implementation of Arisan+ savings pool contract
 * @dev Implements the full pool lifecycle with state machine transitions
 */
contract Pool is IPool, AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role identifier for pool factory
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    
    /// @notice Role identifier for emergency admin
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    /// @notice Minimum number of members required to lock a pool
    uint256 public constant MIN_MEMBERS_TO_LOCK = 2;

    /// @notice Maximum duration for a pool (1 year in seconds)
    uint256 public constant MAX_POOL_DURATION = 365 days;

    /// @notice Minimum duration for a pool (1 day in seconds)
    uint256 public constant MIN_POOL_DURATION = 1 days;

    /// @notice Maximum number of members allowed in any pool
    uint256 public constant MAX_MEMBERS_LIMIT = 100;

    /// @notice Core pool information
    PoolInfo private _poolInfo;
    
    /// @notice Array of all member addresses
    address[] private _members;
    
    /// @notice Mapping from address to member information
    mapping(address => PoolMember) private _memberInfo;
    
    /// @notice Mapping to check if address is a member
    mapping(address => bool) private _isMember;
    
    /// @notice Total yield earned by the pool
    uint256 private _totalYield;
    
    /// @notice Whether the pool has been initialized
    bool private _initialized;
    
    /// @notice Address of the factory that created this pool
    address private _factory;

    /// @notice Address of the badge NFT contract
    address private _badgeContract;

    /// @notice Address of the lottery manager contract
    address private _lotteryManager;

    /// @notice Custom errors for gas efficiency
    error PoolAlreadyInitialized();
    error PoolNotOpen();
    error PoolNotLocked();
    error PoolNotActive();
    error PoolNotCompleted();
    error InvalidContribution(uint256 sent, uint256 required);
    error AlreadyMember();
    error NotMember();
    error PoolFull();
    error CannotLeaveAfterLock();
    error AlreadyWithdrawn();
    error WithdrawalFailed();
    error YieldManagerCallFailed();
    error UnauthorizedAccess();
    error InvalidState(PoolStatus current, PoolStatus required);
    error BadgeMintingFailed();
    error InvalidParameters();
    error ZeroAddress();
    error InsufficientMembers();
    error DurationNotExpired();

    /**
     * @notice Modifier to check if caller is the pool creator
     */
    modifier onlyCreator() {
        if (msg.sender != _poolInfo.creator) revert UnauthorizedAccess();
        _;
    }

    /**
     * @notice Modifier to check if pool is in specific status
     * @param requiredStatus The status the pool must be in
     */
    modifier inStatus(PoolStatus requiredStatus) {
        if (_poolInfo.status != requiredStatus) {
            revert InvalidState(_poolInfo.status, requiredStatus);
        }
        _;
    }

    /**
     * @notice Modifier to validate addresses are not zero
     * @param addr Address to validate
     */
    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    /**
     * @notice Constructor initializes the pool with given parameters
     * @param name Human-readable pool name
     * @param contributionAmount Required contribution per member (in wei)
     * @param maxMembers Maximum number of members allowed
     * @param duration Duration of the pool in seconds
     * @param creator Address of the pool creator
     * @param yieldManager Address of yield management contract
     * @param badgeContract Address of the badge NFT contract
     * @param lotteryManager Address of the lottery manager contract
     */
    constructor(
        string memory name,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 duration,
        address creator,
        address yieldManager,
        address badgeContract,
        address lotteryManager
    ) 
        validAddress(creator)
        validAddress(yieldManager)
    {
        if (_initialized) revert PoolAlreadyInitialized();
        if (bytes(name).length == 0) revert InvalidParameters();
        if (contributionAmount == 0) revert InvalidParameters();
        if (maxMembers < 2 || maxMembers > MAX_MEMBERS_LIMIT) revert InvalidParameters();
        if (duration < MIN_POOL_DURATION || duration > MAX_POOL_DURATION) revert InvalidParameters();
        
        _grantRole(DEFAULT_ADMIN_ROLE, creator);
        _grantRole(EMERGENCY_ADMIN_ROLE, creator);
        _grantRole(FACTORY_ROLE, msg.sender);
        
        // Store factory address for poolId lookup
        _factory = msg.sender;
        
        // Store badge contract address (can be zero for pools without badges)
        _badgeContract = badgeContract;
        
        // Store lottery manager address (can be zero for pools without lottery)
        _lotteryManager = lotteryManager;
        
        _poolInfo = PoolInfo({
            creator: creator,
            name: name,
            contributionAmount: contributionAmount,
            maxMembers: maxMembers,
            duration: duration,
            status: PoolStatus.Open,
            createdAt: block.timestamp,
            lockedAt: 0,
            totalFunds: 0,
            currentMembers: 0,
            yieldManager: yieldManager
        });
        
        _initialized = true;
        
        // Note: Badge minting will be handled by PoolFactory after pool registration
    }

    /**
     * @notice Join the savings pool by contributing the required amount
     * @dev Must send exact contribution amount. Pool must be in Open status.
     *      Automatically locks pool when max members is reached.
     */
    function joinPool() external payable override nonReentrant whenNotPaused inStatus(PoolStatus.Open) {
        if (msg.value != _poolInfo.contributionAmount) {
            revert InvalidContribution(msg.value, _poolInfo.contributionAmount);
        }
        
        if (_isMember[msg.sender]) revert AlreadyMember();
        
        if (_poolInfo.currentMembers >= _poolInfo.maxMembers) revert PoolFull();
        
        // Add member to the pool
        _memberInfo[msg.sender] = PoolMember({
            memberAddress: msg.sender,
            contribution: msg.value,
            joinedAt: block.timestamp,
            hasWithdrawn: false,
            yieldEarned: 0
        });
        
        _isMember[msg.sender] = true;
        _members.push(msg.sender);
        _poolInfo.currentMembers++;
        _poolInfo.totalFunds += msg.value;
        
        emit MemberJoined(msg.sender, msg.value, _poolInfo.currentMembers);
        
        // Mint EarlyJoiner badge for first 3 members, PoolCompleter badge for all
        _mintMemberBadge(msg.sender, msg.value);
        
        // Auto-lock if pool is full and still in Open status
        if (_poolInfo.currentMembers == _poolInfo.maxMembers && _poolInfo.status == PoolStatus.Open) {
            _lockPool();
        }
    }

    /**
     * @notice Leave the pool before it's locked (emergency exit)
     * @dev Can only be called when pool status is Open
     *      Returns full contribution to the member
     */
    function leavePool() external override nonReentrant whenNotPaused inStatus(PoolStatus.Open) {
        if (!_isMember[msg.sender]) revert NotMember();
        
        PoolMember storage member = _memberInfo[msg.sender];
        uint256 refundAmount = member.contribution;
        
        // Remove member from pool
        _removeMember(msg.sender);
        
        // Remove from lottery if pool was already locked (shouldn't happen but safety check)
        if (_poolInfo.status != PoolStatus.Open && _lotteryManager != address(0)) {
            _removeLotteryParticipant(msg.sender);
        }
        
        // Refund the contribution
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert WithdrawalFailed();
        
        emit MemberLeft(msg.sender, refundAmount);
    }

    /**
     * @notice Lock the pool and begin yield generation
     * @dev Can be called by creator when max members reached or manually
     *      Transfers funds to yield manager for investment
     */
    function lockPool() external override onlyCreator nonReentrant whenNotPaused inStatus(PoolStatus.Open) {
        if (_poolInfo.currentMembers < MIN_MEMBERS_TO_LOCK) revert InsufficientMembers();
        _lockPool();
    }

    /**
     * @notice Internal function to lock the pool
     */
    function _lockPool() internal {
        // Prevent double-locking
        if (_poolInfo.status != PoolStatus.Open) {
            return; // Already locked or in another state
        }
        
        _poolInfo.status = PoolStatus.Locked;
        _poolInfo.lockedAt = block.timestamp;
        
        // Transfer funds to yield manager with correct poolId
        if (_poolInfo.totalFunds > 0) {
            uint256 poolId = _getPoolId();
            
            // Use low-level call for better error handling
            (bool success, bytes memory data) = _poolInfo.yieldManager.call{value: _poolInfo.totalFunds}(
                abi.encodeWithSelector(
                    IYieldManager.deposit.selector,
                    poolId,
                    IYieldManager.YieldStrategy.MockYield
                )
            );
            
            if (!success) {
                // Decode revert reason if available
                if (data.length > 0) {
                    assembly {
                        let returndata_size := mload(data)
                        revert(add(32, data), returndata_size)
                    }
                } else {
                    revert YieldManagerCallFailed();
                }
            }
        }
        
        emit PoolLocked(_poolInfo.lockedAt, _poolInfo.totalFunds);
        
        // Register lottery participants if lottery manager is configured
        _registerLotteryParticipants();
        
        // Immediately transition to Active if locked at current time
        _poolInfo.status = PoolStatus.Active;

        
    }

    /**
     * @notice Complete the pool and prepare for fund distribution
     * @dev Called when pool duration expires or yield target is met
     *      Withdraws all funds from yield manager
     */
    function completePool() external override nonReentrant whenNotPaused {
        if (_poolInfo.status != PoolStatus.Active) {
            revert InvalidState(_poolInfo.status, PoolStatus.Active);
        }
        
        // Check if duration has elapsed (anyone can call when time is up)
        if (block.timestamp < _poolInfo.lockedAt + _poolInfo.duration) {
            revert DurationNotExpired();
        }
        
        _completePool();
    }

    /**
     * @notice Internal function to complete the pool
     * @dev Handles the actual completion logic
     */
    function _completePool() internal {
        uint256 poolId = _getPoolId();
        
        // Record pool balance before yield manager withdrawal
        uint256 balanceBefore = address(this).balance;
        
        // Withdraw funds from yield manager with better error handling
        (bool success, bytes memory data) = _poolInfo.yieldManager.call(
            abi.encodeWithSelector(IYieldManager.withdraw.selector, poolId)
        );
        
        if (success) {
            (uint256 principal, uint256 yield) = abi.decode(data, (uint256, uint256));
            _totalYield = yield;
            
            // Verify we received the expected ETH amount
            uint256 balanceAfter = address(this).balance;
            uint256 expectedReceived = principal + yield;
            uint256 actualReceived = balanceAfter - balanceBefore;
            
            // Verify we received the expected principal amount
            if (actualReceived < expectedReceived) {
                // Log the discrepancy but don't revert - continue with completion
                // However, adjust yield based on actual received amount
                if (actualReceived >= principal) {
                    _totalYield = actualReceived - principal;
                } else {
                    _totalYield = 0;
                    // Critical issue: we didn't even get principal back
                    emit YieldUpdated(0, 0);
                }
            }
        } else {
            // If yield manager withdrawal fails, continue with 0 yield
            _totalYield = 0;
            emit YieldUpdated(0, 0);
        }
        
        // Update member yield allocations
        _updateMemberYields();
        
        _poolInfo.status = PoolStatus.Completed;
        
        // Mint PoolCompleter badges for all members
        _mintCompletionBadges();
        
        emit PoolCompleted(_totalYield, _poolInfo.totalFunds + _totalYield);
    }

    /**
     * @notice Trigger automatic completion if conditions are met
     * @dev Can be called by anyone to trigger completion when time expires
     *      Gas-efficient way to ensure pools don't remain active indefinitely
     */
    function triggerCompletion() external {
        if (_poolInfo.status == PoolStatus.Active && 
            block.timestamp >= _poolInfo.lockedAt + _poolInfo.duration) {
            _completePool();
        }
    }

    /**
     * @notice Withdraw member's share after pool completion
     * @dev Can only be called when pool status is Completed
     *      Calculates proportional share of principal + yield
     */
    function withdrawShare() external override nonReentrant whenNotPaused inStatus(PoolStatus.Completed) {
        if (!_isMember[msg.sender]) revert NotMember();
        
        PoolMember storage member = _memberInfo[msg.sender];
        if (member.hasWithdrawn) revert AlreadyWithdrawn();
        
        uint256 principal = member.contribution;
        uint256 yieldShare = member.yieldEarned;
        uint256 totalAmount = principal + yieldShare;
        
        // Verify contract has sufficient balance before marking as withdrawn
        if (address(this).balance < totalAmount) revert WithdrawalFailed();
        
        member.hasWithdrawn = true;
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        if (!success) revert WithdrawalFailed();
        
        emit MemberWithdrawal(msg.sender, principal, yieldShare, totalAmount);
    }

    /**
     * @notice Emergency withdrawal for specific member (admin only)
     * @param member Address of member to withdraw for
     * @dev Used in emergency situations or for inactive members
     */
    function emergencyWithdraw(address member) external override onlyRole(EMERGENCY_ADMIN_ROLE) nonReentrant {
        if (!_isMember[member]) revert NotMember();
        
        PoolMember storage memberInfo = _memberInfo[member];
        if (memberInfo.hasWithdrawn) revert AlreadyWithdrawn();
        
        uint256 principal = memberInfo.contribution;
        uint256 yieldShare = memberInfo.yieldEarned;
        uint256 totalAmount = principal + yieldShare;
        
        memberInfo.hasWithdrawn = true;
        
        // Transfer funds
        (bool success, ) = payable(member).call{value: totalAmount}("");
        if (!success) revert WithdrawalFailed();
        
        emit MemberWithdrawal(member, principal, yieldShare, totalAmount);
    }

    /**
     * @notice Update yield information from yield manager
     * @dev Called periodically to sync yield data
     *      Updates member yield allocations
     *      Automatically completes pool if duration has expired
     */
    function updateYield() external override {
        // Check for automatic completion first
        if (_poolInfo.status == PoolStatus.Active && 
            block.timestamp >= _poolInfo.lockedAt + _poolInfo.duration) {
            _completePool();
            return;
        }
        
        if (_poolInfo.status == PoolStatus.Active || _poolInfo.status == PoolStatus.Completed) {
            uint256 poolId = _getPoolId();
            
            // Use low-level call for yield manager interaction
            (bool success, bytes memory data) = _poolInfo.yieldManager.staticcall(
                abi.encodeWithSelector(IYieldManager.getYield.selector, poolId)
            );
            
            if (success && data.length > 0) {
                uint256 currentYield = abi.decode(data, (uint256));
                _totalYield = currentYield;
                _updateMemberYields();
                
                // Calculate APY (simplified) - protect against division by zero
                uint256 yieldRate = _poolInfo.totalFunds > 0 
                    ? (_totalYield * 10000) / _poolInfo.totalFunds 
                    : 0; // basis points
                emit YieldUpdated(_totalYield, yieldRate);
                
                // Request lottery draw if conditions are met
                _requestLotteryDrawIfEligible();
            }
            // Silently fail for view function if yield manager call fails
        }
    }

    /**
     * @notice Updates yield allocation for all members
     */
    function _updateMemberYields() internal {
        if (_poolInfo.currentMembers == 0) return;
        
        uint256 yieldPerMember = _totalYield / _poolInfo.currentMembers;
        
        for (uint256 i = 0; i < _members.length; i++) {
            _memberInfo[_members[i]].yieldEarned = yieldPerMember;
        }
    }

    /**
     * @notice Get the pool ID from the factory
     * @return poolId The unique identifier assigned by the factory
     * @dev Calls the factory contract to retrieve this pool's ID
     *      Returns 0 if factory is not set or call fails (for testing)
     */
    function _getPoolId() internal view returns (uint256 poolId) {
        if (_factory == address(0)) return 0; // Fallback for testing
        
        // Check if factory address has code (is a contract)
        address factoryAddr = _factory;
        uint256 size;
        assembly {
            size := extcodesize(factoryAddr)
        }
        if (size == 0) return 0; // Not a contract, fallback for testing
        
        try IPoolFactory(_factory).getPoolId(address(this)) returns (uint256 id) {
            return id;
        } catch {
            return 0; // Fallback if factory call fails
        }
    }

    /**
     * @notice Removes a member from the pool
     * @param member Address of member to remove
     */
    function _removeMember(address member) internal {
        PoolMember storage memberInfo = _memberInfo[member];
        uint256 contribution = memberInfo.contribution;
        
        // Remove from mapping 
        delete _memberInfo[member];
        _isMember[member] = false;
        
        // Remove from array (expensive but necessary for small arrays)
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i] == member) {
                _members[i] = _members[_members.length - 1];
                _members.pop();
                break;
            }
        }
        
        _poolInfo.currentMembers--;
        _poolInfo.totalFunds -= contribution;
    }

    /**
     * @notice Register all pool members as lottery participants
     * @dev Called when pool locks to make members eligible for lottery draws
     */
    function _registerLotteryParticipants() internal {
        // Early return if lottery manager is not configured
        if (_lotteryManager == address(0)) return;
        
        // Skip if no members to register
        if (_members.length == 0) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Prepare participant arrays - equal weights for MVP
        address[] memory participants = _members;
        uint256[] memory weights = new uint256[](_members.length);
        
        // Assign equal weights for MVP (could be contribution-based in future)
        for (uint256 i = 0; i < _members.length; i++) {
            weights[i] = 1; // Equal weight for all members
        }
        
        // Use low-level call for better error handling
        (bool success, ) = _lotteryManager.call(
            abi.encodeWithSelector(
                ILottery.addParticipants.selector,
                poolId,
                participants,
                weights
            )
        );
        
        // Log failure but don't revert - lottery system should not block pool operations
        if (!success) {
            // Emit event for debugging purposes
            emit YieldUpdated(0, 0); // Reuse existing event for logging
        }
    }

    /**
     * @notice Remove a member from lottery participation
     * @param member Address of the member to remove
     * @dev Called when a member leaves the pool (rare case as leaving after lock is restricted)
     */
    function _removeLotteryParticipant(address member) internal {
        // Early return if lottery manager is not configured
        if (_lotteryManager == address(0)) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Use low-level call for better error handling
        (bool success, ) = _lotteryManager.call(
            abi.encodeWithSelector(
                ILottery.removeParticipant.selector,
                poolId,
                member
            )
        );
        
        // Log failure but don't revert - lottery system should not block pool operations
        if (!success) {
            // Emit event for debugging purposes
            emit YieldUpdated(0, 0); // Reuse existing event for logging
        }
    }

    /**
     * @notice Request lottery draw if pool is eligible and conditions are met
     * @dev Called during yield updates to trigger periodic lottery draws
     */
    function _requestLotteryDrawIfEligible() internal {
        // Early return if lottery manager is not configured
        if (_lotteryManager == address(0)) return;
        
        // Only request draws for active pools
        if (_poolInfo.status != PoolStatus.Active) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Check if pool is eligible for lottery (has minimum participants, etc.)
        (bool success, bytes memory data) = _lotteryManager.staticcall(
            abi.encodeWithSelector(
                ILottery.isPoolEligible.selector,
                poolId
            )
        );
        
        if (!success || data.length == 0) return;
        
        bool isEligible = abi.decode(data, (bool));
        if (!isEligible) return;
        
        // Request lottery draw with current yield
        (bool drawSuccess, ) = _lotteryManager.call(
            abi.encodeWithSelector(
                ILottery.requestDraw.selector,
                poolId,
                _totalYield
            )
        );
        
        // Log failure but don't revert - lottery system should not block pool operations
        if (!drawSuccess) {
            // Emit event for debugging purposes
            emit YieldUpdated(0, 0); // Reuse existing event for logging
        }
    }

    /**
     * @notice Check if lottery manager contract is valid and ready for operations
     * @return isValid True if lottery manager contract is available and functional
     */
    function _isLotteryManagerValid() internal view returns (bool isValid) {
        if (_lotteryManager == address(0)) return false;
        
        // Check if lottery manager address has code (is a contract)
        address lotteryAddr = _lotteryManager;
        uint256 size;
        assembly {
            size := extcodesize(lotteryAddr)
        }
        return size > 0;
    }

    /**
     * @notice Check if factory contract is valid and ready for badge operations
     * @return isValid True if factory contract is available and functional
     */
    function _isFactoryValid() internal view returns (bool isValid) {
        if (_factory == address(0)) return false;
        
        // Check if factory address has code (is a contract)
        address factoryAddr = _factory;
        uint256 size;
        assembly {
            size := extcodesize(factoryAddr)
        }
        return size > 0;
    }

    /**
     * @notice Mint appropriate badge for new member joining the pool
     * @param member Address of the member joining
     * @param contribution Amount contributed by the member
     * @dev This function is called when a member joins the pool to mint their member badge
     */
    function _mintMemberBadge(address member, uint256 contribution) internal {
        // Early return if badge system is not configured
        if (_badgeContract == address(0) || !_isFactoryValid()) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Use low-level call for better error handling and gas efficiency
        (bool success, bytes memory data) = _factory.call(
            abi.encodeWithSelector(
                IPoolFactory.mintPoolMemberBadge.selector,
                member,
                poolId,
                contribution
            )
        );
        
        // Emit event for failed badge minting for debugging purposes
        if (!success) {
            // Decode revert reason if available for debugging
            if (data.length > 0) {
                // Log failure but don't revert - badge system should not block pool operations
                emit YieldUpdated(0, 0); // Reuse existing event for logging
            }
        }
    }

    /**
     * @notice Mint PoolCompleter badges for all pool members
     * @dev Called when pool completes to award completion badges to all members
     */
    function _mintCompletionBadges() internal {
        // Early return if badge system is not configured
        if (_badgeContract == address(0) || !_isFactoryValid()) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Ensure we have members to mint badges for
        if (_members.length == 0) return;
        
        // Use low-level call for better error handling and gas efficiency
        (bool success, bytes memory data) = _factory.call(
            abi.encodeWithSelector(
                IPoolFactory.mintPoolCompletionBadges.selector,
                _members,
                poolId,
                _totalYield
            )
        );
        
        // Emit event for failed badge minting for debugging purposes
        if (!success) {
            // Decode revert reason if available for debugging
            if (data.length > 0) {
                // Log failure but don't revert - badge system should not block pool operations
                emit YieldUpdated(0, 0); // Reuse existing event for logging
            }
        }
    }

    /**
     * @notice Mint PoolCreator badge for pool creator
     * @param creator Address of the pool creator
     * @param contributionAmount Required contribution amount for the pool
     * @dev Called after pool creation to award creator badge
     */
    function _mintCreatorBadge(address creator, uint256 contributionAmount) internal {
        // Early return if badge system is not configured
        if (_badgeContract == address(0) || !_isFactoryValid()) return;
        
        uint256 poolId = _getPoolId();
        if (poolId == 0) return; // Skip if can't get pool ID
        
        // Use low-level call for better error handling and gas efficiency
        (bool success, bytes memory data) = _factory.call(
            abi.encodeWithSelector(
                IPoolFactory.mintPoolCreatorBadge.selector,
                creator,
                poolId,
                contributionAmount
            )
        );
        
        // Emit event for failed badge minting for debugging purposes
        if (!success) {
            // Decode revert reason if available for debugging
            if (data.length > 0) {
                // Log failure but don't revert - badge system should not block pool operations
                emit YieldUpdated(0, 0); // Reuse existing event for logging
            }
        }
    }

    /**
     * @notice Initialize creator badge minting after pool setup
     * @dev This should be called by the factory after pool registration is complete
     */
    function initializeCreatorBadge() external onlyRole(FACTORY_ROLE) {
        _mintCreatorBadge(_poolInfo.creator, _poolInfo.contributionAmount);
    }

    /**
     * @notice Manually trigger lottery draw for this pool (admin only)
     * @dev Allows admin to manually request lottery draw for testing or emergency purposes
     */
    function triggerLotteryDraw() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (_poolInfo.status != PoolStatus.Active) {
            revert InvalidState(_poolInfo.status, PoolStatus.Active);
        }
        
        _requestLotteryDrawIfEligible();
    }

    /**
     * @notice Emergency pause function
     * @dev Only emergency admin can pause the contract
     */
    function pause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Emergency unpause function
     * @dev Only emergency admin can unpause the contract
     */
    function unpause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        _unpause();
    }

    // View Functions

    /**
     * @notice Get detailed information about the pool
     * @return info Complete pool information struct
     */
    function getPoolInfo() external view override returns (PoolInfo memory info) {
        return _poolInfo;
    }

    /**
     * @notice Get information about a specific member
     * @param member Address of the member to query
     * @return memberInfo Complete member information struct
     */
    function getMemberInfo(address member) external view override returns (PoolMember memory memberInfo) {
        return _memberInfo[member];
    }

    /**
     * @notice Get list of all pool members
     * @return members Array of member addresses
     */
    function getMembers() external view override returns (address[] memory members) {
        return _members;
    }

    /**
     * @notice Check if an address is a member of the pool
     * @param account Address to check membership for
     * @return isMember True if address is a pool member
     */
    function isMember(address account) external view override returns (bool) {
        return _isMember[account];
    }

    /**
     * @notice Calculate current yield per member
     * @return yieldPerMember Current yield amount per member
     */
    function getYieldPerMember() external view override returns (uint256 yieldPerMember) {
        if (_poolInfo.currentMembers == 0) return 0;
        return _totalYield / _poolInfo.currentMembers;
    }

    /**
     * @notice Get time remaining until pool completion
     * @return timeRemaining Seconds remaining, 0 if pool is completed
     */
    function getTimeRemaining() external view override returns (uint256 timeRemaining) {
        if (_poolInfo.status != PoolStatus.Active) return 0;
        
        uint256 endTime = _poolInfo.lockedAt + _poolInfo.duration;
        if (block.timestamp >= endTime) return 0;
        
        return endTime - block.timestamp;
    }

    /**
     * @notice Get current total value of the pool (principal + yield)
     * @return totalValue Current total value in wei
     */
    function getTotalValue() external view override returns (uint256 totalValue) {
        return _poolInfo.totalFunds + _totalYield;
    }

    /**
     * @notice Check if pool can be locked
     * @return canLock True if pool meets conditions for locking
     */
    function canLock() external view override returns (bool) {
        return _poolInfo.status == PoolStatus.Open && 
               _poolInfo.currentMembers >= MIN_MEMBERS_TO_LOCK; // Use constant
    }

    /**
     * @notice Check if pool can be completed
     * @return canComplete True if pool meets conditions for completion
     */
    function canComplete() external view override returns (bool) {
        return _poolInfo.status == PoolStatus.Active && 
               block.timestamp >= _poolInfo.lockedAt + _poolInfo.duration;
    }

    /**
     * @notice Get the pool ID assigned by the factory
     * @return poolId The unique identifier for this pool
     */
    function getPoolId() external view returns (uint256 poolId) {
        return _getPoolId();
    }

    /**
     * @notice Get the badge contract address
     * @return badgeContract Address of the badge NFT contract
     */
    function getBadgeContract() external view returns (address badgeContract) {
        return _badgeContract;
    }

    /**
     * @notice Get the lottery manager contract address
     * @return lotteryManager Address of the lottery manager contract
     */
    function getLotteryManager() external view returns (address lotteryManager) {
        return _lotteryManager;
    }

    /**
     * @notice Get contract balance and withdrawal info for debugging
     * @return contractBalance Current ETH balance of the pool contract
     * @return totalWithdrawable Total amount that should be withdrawable by all members
     * @return hasAllFunds Whether contract has sufficient funds for all withdrawals
     */
    function getWithdrawalDebugInfo() external view returns (
        uint256 contractBalance,
        uint256 totalWithdrawable,
        bool hasAllFunds
    ) {
        contractBalance = address(this).balance;
        
        // Calculate total withdrawable amount
        totalWithdrawable = 0;
        for (uint256 i = 0; i < _members.length; i++) {
            address member = _members[i];
            if (!_memberInfo[member].hasWithdrawn) {
                totalWithdrawable += _memberInfo[member].contribution + _memberInfo[member].yieldEarned;
            }
        }
        
        hasAllFunds = contractBalance >= totalWithdrawable;
    }

    /**
     * @notice Get detailed member withdrawal info
     * @param member Address of the member
     * @return canWithdraw Whether the member can withdraw
     * @return principal Member's principal contribution
     * @return yieldShare Member's yield share
     * @return totalAmount Total withdrawal amount
     * @return contractHasFunds Whether contract has sufficient funds for this withdrawal
     */
    function getMemberWithdrawalInfo(address member) external view returns (
        bool canWithdraw,
        uint256 principal,
        uint256 yieldShare,
        uint256 totalAmount,
        bool contractHasFunds
    ) {
        if (!_isMember[member] || _memberInfo[member].hasWithdrawn || _poolInfo.status != PoolStatus.Completed) {
            return (false, 0, 0, 0, false);
        }
        
        principal = _memberInfo[member].contribution;
        yieldShare = _memberInfo[member].yieldEarned;
        totalAmount = principal + yieldShare;
        contractHasFunds = address(this).balance >= totalAmount;
        canWithdraw = contractHasFunds;
    }

    /**
     * @notice Receive function to handle direct ETH transfers
     * @dev Only allow ETH from yield manager and factory for proper fund flow
     */
    receive() external payable {
        // Only allow ETH from yield manager or factory to prevent accidental transfers
        if (msg.sender != _poolInfo.yieldManager && msg.sender != _factory) {
            revert UnauthorizedAccess();
        }
    }

    /**
     * @notice Fallback function to reject any other calls
     */
    fallback() external payable {
        revert UnauthorizedAccess();
    }
}
