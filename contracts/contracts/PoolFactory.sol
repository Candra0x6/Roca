// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IBadge.sol";
import "./Pool.sol";

/**
 * @title PoolFactory
 * @author Arisan+ Team
 * @notice Factory contract for creating and managing Arisan+ savings pools
 * @dev Implements the factory pattern for pool creation with validation and registry
 */
contract PoolFactory is AccessControl, ReentrancyGuard {
    /// @notice Role identifier for pool creators
    bytes32 public constant POOL_CREATOR_ROLE = keccak256("POOL_CREATOR_ROLE");
    
    /// @notice Role identifier for emergency admin
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    /// @notice Minimum contribution amount in wei (0.01 ETH)
    uint256 public constant MIN_CONTRIBUTION = 0.01 ether;
    
    /// @notice Maximum contribution amount in wei (100 ETH)
    uint256 public constant MAX_CONTRIBUTION = 100 ether;
    
    /// @notice Minimum number of members per pool
    uint256 public constant MIN_MEMBERS = 2;
    
    /// @notice Maximum number of members per pool
    uint256 public constant MAX_MEMBERS = 100;
    
    /// @notice Minimum pool duration in seconds (1 week)
    uint256 public constant MIN_DURATION = 7 days;
    
    /// @notice Maximum pool duration in seconds (1 year)
    uint256 public constant MAX_DURATION = 365 days;

    /// @notice Global constraints for the factory
    struct GlobalConstraints {
        uint256 maxTotalPools;        // Maximum total pools that can be created
        uint256 maxPoolsPerCreator;   // Maximum pools per creator
        uint256 maxActivePoolsPerCreator; // Maximum active pools per creator
        uint256 minTimeBetweenPools;  // Minimum time between pool creation (anti-spam)
        bool enforceConstraints;      // Whether to enforce global constraints
    }

    /// @notice Pool statistics for tracking
    struct PoolStatistics {
        uint256 totalPools;           // Total pools created
        uint256 activePools;          // Currently active pools
        uint256 completedPools;       // Completed pools
        uint256 totalValueLocked;     // Total ETH locked across all pools
        uint256 totalYieldGenerated;  // Total yield generated (if trackable)
    }

    /// @notice Global constraints configuration
    GlobalConstraints public globalConstraints;
    
    /// @notice Pool statistics
    PoolStatistics public poolStatistics;

    /// @notice Address of the badge NFT contract
    address private _badgeContract;
    
    /// @notice Address of the lottery manager contract
    // address private _lotteryManager;

    /// @notice Parameters required for pool creation
    struct PoolCreationParams {
        string name;                // Human-readable pool name
        uint256 contributionAmount; // Required contribution per member (in wei)
        uint256 maxMembers;        // Maximum number of members allowed
        uint256 duration;          // Duration of the pool in seconds
        address yieldManager;      // Address of yield management contract
    }

    /// @notice Counter for pool IDs
    uint256 private _poolIdCounter;
    
    /// @notice Array of all created pool addresses
    address[] private _allPools;
    
    /// @notice Mapping from pool ID to pool address
    mapping(uint256 => address) private _pools;
    
    /// @notice Mapping from pool address to pool ID
    mapping(address => uint256) private _poolIds;
    
    /// @notice Mapping from creator to their pool addresses
    mapping(address => address[]) private _creatorPools;
    
    /// @notice Mapping from creator to their last pool creation timestamp
    mapping(address => uint256) private _lastPoolCreation;
    
    /// @notice Mapping from creator to count of active pools
    mapping(address => uint256) private _activePoolsCount;
    
    /// @notice Mapping to track pool status for statistics
    mapping(address => IPool.PoolStatus) private _poolStatuses;
    
    /// @notice Whether the factory is paused for emergency
    bool private _paused;

    /// @notice Emitted when a new pool is created
    /// @param poolId Unique identifier for the pool
    /// @param poolAddress Address of the created pool contract
    /// @param creator Address of the pool creator
    /// @param name Name of the pool
    /// @param contributionAmount Required contribution amount per member
    /// @param maxMembers Maximum number of members allowed
    /// @param duration Pool duration in seconds
    event PoolCreated(
        uint256 indexed poolId,
        address indexed poolAddress,
        address indexed creator,
        string name,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 duration
    );

    /// @notice Emitted when factory is paused or unpaused
    /// @param account Address that triggered the pause/unpause
    /// @param paused Whether the factory is now paused
    event PauseChanged(address indexed account, bool paused);

    /// @notice Emitted when global constraints are updated
    /// @param admin Address that updated the constraints
    /// @param newConstraints New global constraints configuration
    event GlobalConstraintsUpdated(address indexed admin, GlobalConstraints newConstraints);

    /// @notice Emitted when pool statistics are updated
    /// @param totalPools New total pool count
    /// @param activePools New active pool count
    /// @param totalValueLocked New total value locked
    event PoolStatisticsUpdated(uint256 totalPools, uint256 activePools, uint256 totalValueLocked);

    /// @notice Custom errors for gas efficiency
    error FactoryPaused();
    error InvalidContribution(uint256 amount);
    error InvalidMemberCount(uint256 count);
    error InvalidDuration(uint256 duration);
    error InvalidYieldManager(address yieldManager);
    error PoolNameEmpty();
    error PoolCreationFailed();
    error PoolNotFound(uint256 poolId);
    error UnauthorizedAccess();
    error MaxPoolsReached(uint256 maxPools);
    error MaxPoolsPerCreatorReached(uint256 maxPools);
    error MaxActivePoolsPerCreatorReached(uint256 maxPools);
    error PoolCreationTooFrequent(uint256 minInterval);
    error InvalidConstraintValue(string constraint);

    /**
     * @notice Constructor sets up roles and initial state
     * @param admin Address that will have admin roles
     * @param badgeContract Address of the badge NFT contract
     * @param lotteryManager Address of the lottery manager contract
     */
    constructor(address admin, address badgeContract, address lotteryManager) {
        if (admin == address(0)) revert UnauthorizedAccess();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ADMIN_ROLE, admin);
        _grantRole(POOL_CREATOR_ROLE, admin);
        
        // Store badge contract address
        _badgeContract = badgeContract;
        
        // Store lottery manager address
        // Disabled for MVP - re-enabled in future versions
        // _lotteryManager = lotteryManager;
        
        // Allow anyone to create pools by default
        _setRoleAdmin(POOL_CREATOR_ROLE, DEFAULT_ADMIN_ROLE);
        
        // Initialize global constraints with reasonable defaults
        globalConstraints = GlobalConstraints({
            maxTotalPools: 10000,        // 10k pools max
            maxPoolsPerCreator: 50,      // 50 pools per creator
            maxActivePoolsPerCreator: 10, // 10 active pools per creator
            minTimeBetweenPools: 1 hours, // 1 hour between pool creation
            enforceConstraints: true      // Enable constraints by default
        });
        
        // Initialize statistics
        poolStatistics = PoolStatistics({
            totalPools: 0,
            activePools: 0,
            completedPools: 0,
            totalValueLocked: 0,
            totalYieldGenerated: 0
        });
    }

    /**
     * @notice Creates a new savings pool with specified parameters
     * @param params Pool creation parameters struct
     * @return poolId Unique identifier for the created pool
     * @return poolAddress Address of the created pool contract
     * @dev Validates all parameters and deploys a new Pool contract
     */
    function createPool(PoolCreationParams calldata params) 
        external 
        nonReentrant        
        returns (uint256 poolId, address poolAddress) 
    {
        if (_paused) revert FactoryPaused();
        
        _validatePoolParams(params);
        _enforceGlobalConstraints(msg.sender);
        
        // Increment pool ID counter
        poolId = ++_poolIdCounter;
        
        // Fake Lottery Manager data
        address lotteryManager = address(0);

        // Deploy new Pool contract
        Pool newPool = new Pool(
            params.name,
            params.contributionAmount,
            params.maxMembers,
            params.duration,
            msg.sender,
            params.yieldManager,
            _badgeContract,
            lotteryManager
        );
        
        poolAddress = address(newPool);
        
        if (poolAddress == address(0)) revert PoolCreationFailed();
        
        // Register the pool
        _pools[poolId] = poolAddress;
        _poolIds[poolAddress] = poolId;
        _allPools.push(poolAddress);
        _creatorPools[msg.sender].push(poolAddress);
        
        // Update tracking data
        _lastPoolCreation[msg.sender] = block.timestamp;
        _activePoolsCount[msg.sender]++;
        _poolStatuses[poolAddress] = IPool.PoolStatus.Open;
        
        // Update statistics
        poolStatistics.totalPools++;
        poolStatistics.activePools++;

        // Disabled for MVP - re-enabled in future versions
        // Grant POOL_ROLE to the new pool for lottery integration
        // if (_lotteryManager != address(0)) {
        //     bytes32 poolRole = keccak256("POOL_ROLE");
        //     bytes memory grantRoleCalldata = abi.encodeWithSignature(
        //         "grantRole(bytes32,address)",
        //         poolRole,
        //         poolAddress
        //     );
            
        //     (bool success, ) = _lotteryManager.call(grantRoleCalldata);
        //     if (!success) {
        //         // Role granting failed - don't revert pool creation
        //         // This allows pool creation to continue even if lottery integration fails
        //     }
        // }
        
        // Mint PoolCreator badge after pool is registered
        if (_badgeContract != address(0)) {
            try IBadge(_badgeContract).mintBadge(
                msg.sender,
                IBadge.BadgeType.PoolCreator,
                poolId,
                params.contributionAmount,
                abi.encode("Pool Creator", block.timestamp)
            ) {
                // Badge minting successful
            } catch {
                // Badge minting failed - don't revert pool creation
            }
        }
        
        emit PoolCreated(
            poolId,
            poolAddress,
            msg.sender,
            params.name,
            params.contributionAmount,
            params.maxMembers,
            params.duration
        );
        
        emit PoolStatisticsUpdated(
            poolStatistics.totalPools,
            poolStatistics.activePools,
            poolStatistics.totalValueLocked
        );
    }

    /**
     * @notice Validates pool creation parameters
     * @param params Pool creation parameters to validate
     */
    function _validatePoolParams(PoolCreationParams calldata params) internal pure {
        if (bytes(params.name).length == 0) revert PoolNameEmpty();
        
        if (params.contributionAmount < MIN_CONTRIBUTION || 
            params.contributionAmount > MAX_CONTRIBUTION) {
            revert InvalidContribution(params.contributionAmount);
        }
        
        if (params.maxMembers < MIN_MEMBERS || 
            params.maxMembers > MAX_MEMBERS) {
            revert InvalidMemberCount(params.maxMembers);
        }
        
        if (params.duration < MIN_DURATION || 
            params.duration > MAX_DURATION) {
            revert InvalidDuration(params.duration);
        }
        
        if (params.yieldManager == address(0)) {
            revert InvalidYieldManager(params.yieldManager);
        }
    }

    /**
     * @notice Enforces global constraints for pool creation
     * @param creator Address of the pool creator
     * @dev Checks all global constraints if enabled
     */
    function _enforceGlobalConstraints(address creator) internal view {
        if (!globalConstraints.enforceConstraints) return;
        
        // Check maximum total pools
        if (globalConstraints.maxTotalPools > 0 && 
            poolStatistics.totalPools >= globalConstraints.maxTotalPools) {
            revert MaxPoolsReached(globalConstraints.maxTotalPools);
        }
        
        // Check maximum pools per creator
        if (globalConstraints.maxPoolsPerCreator > 0 && 
            _creatorPools[creator].length >= globalConstraints.maxPoolsPerCreator) {
            revert MaxPoolsPerCreatorReached(globalConstraints.maxPoolsPerCreator);
        }
        
        // Check maximum active pools per creator
        if (globalConstraints.maxActivePoolsPerCreator > 0 && 
            _activePoolsCount[creator] >= globalConstraints.maxActivePoolsPerCreator) {
            revert MaxActivePoolsPerCreatorReached(globalConstraints.maxActivePoolsPerCreator);
        }
        
        // Check minimum time between pool creation
        if (globalConstraints.minTimeBetweenPools > 0 && 
            _lastPoolCreation[creator] > 0 &&
            block.timestamp < _lastPoolCreation[creator] + globalConstraints.minTimeBetweenPools) {
            revert PoolCreationTooFrequent(globalConstraints.minTimeBetweenPools);
        }
    }

    /**
     * @notice Pauses or unpauses the factory
     * @param paused Whether to pause the factory
     * @dev Only emergency admin can call this function
     */
    function setPaused(bool paused) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        _paused = paused;
        emit PauseChanged(msg.sender, paused);
    }

    /**
     * @notice Grants pool creator role to an address
     * @param account Address to grant the role to
     * @dev Only admin can call this function
     */
    function grantPoolCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(POOL_CREATOR_ROLE, account);
    }

    /**
     * @notice Revokes pool creator role from an address
     * @param account Address to revoke the role from
     * @dev Only admin can call this function
     */
    function revokePoolCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(POOL_CREATOR_ROLE, account);
    }

    /**
     * @notice Updates global constraints configuration
     * @param newConstraints New constraints to apply
     * @dev Only admin can update constraints
     */
    function updateGlobalConstraints(GlobalConstraints calldata newConstraints) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _validateConstraints(newConstraints);
        globalConstraints = newConstraints;
        emit GlobalConstraintsUpdated(msg.sender, newConstraints);
    }

    /**
     * @notice Updates pool status for statistics tracking
     * @param poolAddress Address of the pool
     * @param newStatus New status of the pool
     * @dev Can be called by pool contracts or admin for status updates
     */
    function updatePoolStatus(address poolAddress, IPool.PoolStatus newStatus) 
        external 
    {
        // Allow the pool itself or admin to update status
        if (msg.sender != poolAddress && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        if (_poolIds[poolAddress] == 0) revert PoolNotFound(0);
        
        IPool.PoolStatus oldStatus = _poolStatuses[poolAddress];
        _poolStatuses[poolAddress] = newStatus;
        
        // Update statistics based on status change
        _updateStatisticsOnStatusChange(poolAddress, oldStatus, newStatus);
    }

    /**
     * @notice Validates global constraints configuration
     * @param constraints Constraints to validate
     */
    function _validateConstraints(GlobalConstraints calldata constraints) internal pure {
        if (constraints.maxTotalPools == 0) {
            revert InvalidConstraintValue("maxTotalPools cannot be zero");
        }
        if (constraints.maxPoolsPerCreator == 0) {
            revert InvalidConstraintValue("maxPoolsPerCreator cannot be zero");
        }
        if (constraints.maxActivePoolsPerCreator == 0) {
            revert InvalidConstraintValue("maxActivePoolsPerCreator cannot be zero");
        }
        if (constraints.maxActivePoolsPerCreator > constraints.maxPoolsPerCreator) {
            revert InvalidConstraintValue("maxActivePoolsPerCreator cannot exceed maxPoolsPerCreator");
        }
    }

    /**
     * @notice Updates statistics when pool status changes
     * @param poolAddress Address of the pool
     * @param oldStatus Previous status
     * @param newStatus New status
     */
    function _updateStatisticsOnStatusChange(
        address poolAddress,
        IPool.PoolStatus oldStatus,
        IPool.PoolStatus newStatus
    ) internal {
        // Get pool creator for active pool count tracking
        address creator = IPool(poolAddress).getPoolInfo().creator;
        
        // Update active pools count
        if (oldStatus == IPool.PoolStatus.Open || oldStatus == IPool.PoolStatus.Locked || oldStatus == IPool.PoolStatus.Active) {
            if (newStatus == IPool.PoolStatus.Completed) {
                poolStatistics.activePools--;
                poolStatistics.completedPools++;
                _activePoolsCount[creator]--;
            }
        }
        
        emit PoolStatisticsUpdated(
            poolStatistics.totalPools,
            poolStatistics.activePools,
            poolStatistics.totalValueLocked
        );
    }

    // View Functions

    /**
     * @notice Gets the address of a pool by its ID
     * @param poolId The pool ID to query
     * @return poolAddress Address of the pool contract
     */
    function getPool(uint256 poolId) external view returns (address poolAddress) {
        poolAddress = _pools[poolId];
        if (poolAddress == address(0)) revert PoolNotFound(poolId);
    }

    /**
     * @notice Gets the ID of a pool by its address
     * @param poolAddress The pool address to query
     * @return poolId ID of the pool
     */
    function getPoolId(address poolAddress) external view returns (uint256 poolId) {
        poolId = _poolIds[poolAddress];
        if (poolId == 0) revert PoolNotFound(0);
    }

    /**
     * @notice Gets all pool addresses created by a specific creator
     * @param creator Address of the creator
     * @return pools Array of pool addresses created by the creator
     */
    function getCreatorPools(address creator) external view returns (address[] memory pools) {
        return _creatorPools[creator];
    }

    /**
     * @notice Gets all pool addresses
     * @return pools Array of all pool addresses
     */
    function getAllPools() external view returns (address[] memory pools) {
        return _allPools;
    }

    /**
     * @notice Gets the total number of pools created
     * @return count Total number of pools
     */
    function getPoolCount() external view returns (uint256 count) {
        return _poolIdCounter;
    }

    /**
     * @notice Checks if the factory is currently paused
     * @return paused Whether the factory is paused
     */
    function isPaused() external view returns (bool paused) {
        return _paused;
    }

    /**
     * @notice Gets pool information by pool ID
     * @param poolId The pool ID to query
     * @return info Complete pool information struct
     */
    function getPoolInfo(uint256 poolId) external view returns (IPool.PoolInfo memory info) {
        address poolAddress = _pools[poolId];
        if (poolAddress == address(0)) revert PoolNotFound(poolId);
        
        IPool pool = IPool(poolAddress);
        return pool.getPoolInfo();
    }

    /**
     * @notice Checks if an address is a valid pool created by this factory
     * @param poolAddress Address to check
     * @return isValid Whether the address is a valid pool
     */
    function isValidPool(address poolAddress) external view returns (bool isValid) {
        return _poolIds[poolAddress] != 0;
    }

    /**
     * @notice Gets the current global constraints configuration
     * @return constraints Current global constraints
     */
    function getGlobalConstraints() external view returns (GlobalConstraints memory constraints) {
        return globalConstraints;
    }

    /**
     * @notice Gets the current pool statistics
     * @return statistics Current pool statistics
     */
    function getPoolStatistics() external view returns (PoolStatistics memory statistics) {
        return poolStatistics;
    }

    /**
     * @notice Gets the number of active pools for a creator
     * @param creator Address of the creator
     * @return activeCount Number of active pools
     */
    function getActivePoolsCount(address creator) external view returns (uint256 activeCount) {
        return _activePoolsCount[creator];
    }

    /**
     * @notice Gets the last pool creation timestamp for a creator
     * @param creator Address of the creator
     * @return timestamp Last pool creation timestamp
     */
    function getLastPoolCreation(address creator) external view returns (uint256 timestamp) {
        return _lastPoolCreation[creator];
    }

    /**
     * @notice Gets the status of a pool
     * @param poolAddress Address of the pool
     * @return status Current status of the pool
     */
    function getPoolStatus(address poolAddress) external view returns (IPool.PoolStatus status) {
        if (_poolIds[poolAddress] == 0) revert PoolNotFound(0);
        return _poolStatuses[poolAddress];
    }

    /**
     * @notice Gets pools by status
     * @param status Status to filter by
     * @return pools Array of pool addresses with the specified status
     */
    function getPoolsByStatus(IPool.PoolStatus status) external view returns (address[] memory pools) {
        address[] memory allPools = _allPools;
        address[] memory filteredPools = new address[](allPools.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allPools.length; i++) {
            if (_poolStatuses[allPools[i]] == status) {
                filteredPools[count] = allPools[i];
                count++;
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(filteredPools, count)
        }
        
        return filteredPools;
    }

    /**
     * @notice Checks if a creator can create a new pool based on constraints
     * @param creator Address of the creator
     * @return canCreate Whether the creator can create a new pool
     * @return reason Reason if they cannot create (empty if they can)
     */
    function canCreatePool(address creator) external view returns (bool canCreate, string memory reason) {
        if (!globalConstraints.enforceConstraints) {
            return (true, "");
        }
        
        // Check maximum total pools
        if (globalConstraints.maxTotalPools > 0 && 
            poolStatistics.totalPools >= globalConstraints.maxTotalPools) {
            return (false, "Maximum total pools reached");
        }
        
        // Check maximum pools per creator
        if (globalConstraints.maxPoolsPerCreator > 0 && 
            _creatorPools[creator].length >= globalConstraints.maxPoolsPerCreator) {
            return (false, "Maximum pools per creator reached");
        }
        
        // Check maximum active pools per creator
        if (globalConstraints.maxActivePoolsPerCreator > 0 && 
            _activePoolsCount[creator] >= globalConstraints.maxActivePoolsPerCreator) {
            return (false, "Maximum active pools per creator reached");
        }
        
        // Check minimum time between pool creation
        if (globalConstraints.minTimeBetweenPools > 0 && 
            _lastPoolCreation[creator] > 0 &&
            block.timestamp < _lastPoolCreation[creator] + globalConstraints.minTimeBetweenPools) {
            return (false, "Pool creation too frequent");
        }
        
        return (true, "");
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
     * Disabled for MVP - re-enabled in future versions
     * @return lotteryManager Address of the lottery manager contract
     */
    // function getLotteryManager() external view returns (address lotteryManager) {
    //     return _lotteryManager;
    // }

    /**
     * @notice Set the badge contract address (admin only)
     * @param badgeContract New badge contract address
     */
    function setBadgeContract(address badgeContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _badgeContract = badgeContract;
    }

    /**
     * @notice Set the lottery manager contract address (admin only)
     * Disabled for MVP - re-enabled in future versions
     * @param lotteryManager New lottery manager contract address
     */
    // function setLotteryManager(address lotteryManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
    //     _lotteryManager = lotteryManager;
    // }

    // Badge Minting Functions - called by Pool contracts

    /**
     * @notice Mint PoolCreator badge for pool creator
     * @param creator Address of the pool creator
     * @param poolId ID of the pool
     * @param contributionAmount Required contribution amount for the pool
     */
    function mintPoolCreatorBadge(address creator, uint256 poolId, uint256 contributionAmount) external {
        require(_poolIds[msg.sender] != 0, "Only pools can mint badges");
        if (_badgeContract == address(0)) return;
        
        IBadge(_badgeContract).mintBadge(
            creator,
            IBadge.BadgeType.PoolCreator,
            poolId,
            contributionAmount,
            abi.encode("Pool Creator", block.timestamp)
        );
    }

    /**
     * @notice Mint EarlyJoiner badge for pool member
     * @param member Address of the member joining
     * @param poolId ID of the pool
     * @param contribution Amount contributed by the member
     */
    function mintPoolMemberBadge(address member, uint256 poolId, uint256 contribution) external {
        require(_poolIds[msg.sender] != 0, "Only pools can mint badges");
        if (_badgeContract == address(0)) return;
        
        try IBadge(_badgeContract).mintBadge(
            member,
            IBadge.BadgeType.EarlyJoiner,
            poolId,
            contribution,
            abi.encode("Pool Joiner", block.timestamp)
        ) {
            // Badge minting successful
        } catch {
            // Badge minting failed - don't revert
        }
    }

    /**
     * @notice Mint PoolCompleter and HighYielder badges for all pool members
     * @param members Array of member addresses
     * @param poolId ID of the pool
     * @param totalYield Total yield earned by the pool
     */
    function mintPoolCompletionBadges(address[] memory members, uint256 poolId, uint256 totalYield) external {
        require(_poolIds[msg.sender] != 0, "Only pools can mint badges");
        if (_badgeContract == address(0)) return;
        
        uint256 yieldPerMember = members.length > 0 ? totalYield / members.length : 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            
            // Mint PoolCompleter badge
            try IBadge(_badgeContract).mintBadge(
                member,
                IBadge.BadgeType.PoolCompleter,
                poolId,
                yieldPerMember,
                abi.encode("Pool Completed", block.timestamp, totalYield)
            ) {
                // Badge minting successful
            } catch {
                // Badge minting failed - continue with next member
            }
            
            // Mint HighYielder badge if yield is significant (>0.1 ETH)
            if (yieldPerMember >= 0.1 ether) {
                try IBadge(_badgeContract).mintBadge(
                    member,
                    IBadge.BadgeType.HighYielder,
                    poolId,
                    yieldPerMember,
                    abi.encode("High Yield Achieved", block.timestamp, yieldPerMember)
                ) {
                    // Badge minting successful
                } catch {
                    // Badge minting failed - continue
                }
            }
        }
    }
}
