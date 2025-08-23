// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IBadge.sol";

/**
 * @title Badge
 * @author Arisan+ Team
 * @notice Implementation of Arisan+ achievement badge NFT system
 * @dev Extends ERC721 for gamification and user recognition with comprehensive badge management
 */
contract Badge is IBadge, ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    using Strings for uint256;

    /// @notice Role identifier for badge minters (Pool, Lottery contracts)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role identifier for badge admin
    bytes32 public constant BADGE_ADMIN_ROLE = keccak256("BADGE_ADMIN_ROLE");

    /// @notice Counter for unique token IDs
    uint256 private _nextTokenId;

    /// @notice Base URI for badge metadata
    string private _baseTokenURI;

    /// @notice Mapping from token ID to badge information
    mapping(uint256 => BadgeInfo) private _badges;

    /// @notice Mapping from badge type to template configuration
    mapping(BadgeType => BadgeTemplate) private _badgeTemplates;

    /// @notice Mapping from user address to their badge statistics
    mapping(address => UserBadgeStats) private _userStats;

    /// @notice Mapping from user to array of owned token IDs
    mapping(address => uint256[]) private _userTokens;

    /// @notice Mapping from badge type to array of token IDs
    mapping(BadgeType => uint256[]) private _badgesByType;

    /// @notice Mapping from rarity to array of token IDs
    mapping(BadgeRarity => uint256[]) private _badgesByRarity;

    /// @notice Mapping from pool ID to array of token IDs
    mapping(uint256 => uint256[]) private _poolBadges;

    /// @notice Mapping to track if user owns specific badge type
    mapping(address => mapping(BadgeType => bool)) private _userOwnsBadgeType;

    /// @notice Array to track all users for leaderboard (gas-intensive, consider alternatives in production)
    address[] private _allUsers;
    mapping(address => bool) private _isUserTracked;

    /// @notice Rarity multipliers for reputation calculation
    mapping(BadgeRarity => uint256) private _rarityMultipliers;

    /// @notice Custom errors for gas efficiency
    error InvalidBadgeType();
    error InvalidRarity();
    error BadgeNotActive();
    error ExceedsMaxSupply();
    error ArrayLengthMismatch();
    error TokenNotExists();
    error NotTokenOwnerOrAdmin();
    error InvalidTemplate();
    error ZeroAddress();

    /**
     * @notice Constructor initializes the badge contract
     * @param admin Address of the initial admin
     * @param baseURI Base URI for badge metadata
     */
    constructor(
        address admin,
        string memory baseURI
    ) ERC721("Arisan+ Achievement Badges", "ARISAN+") {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BADGE_ADMIN_ROLE, admin);
        
        _baseTokenURI = baseURI;
        _nextTokenId = 1;

        // Initialize rarity multipliers for reputation calculation
        _rarityMultipliers[BadgeRarity.Common] = 1;
        _rarityMultipliers[BadgeRarity.Uncommon] = 2;
        _rarityMultipliers[BadgeRarity.Rare] = 5;
        _rarityMultipliers[BadgeRarity.Epic] = 10;
        _rarityMultipliers[BadgeRarity.Legendary] = 25;

        // Initialize default badge templates
        _initializeDefaultTemplates();
    }

    /**
     * @notice Mint a badge for a user achievement
     * @param recipient Address to receive the badge
     * @param badgeType Type of badge to mint
     * @param poolId Associated pool identifier (use 0 if not pool-specific)
     * @param value Associated value for the achievement
     * @param achievementData Additional data about the achievement
     * @return tokenId The minted token ID
     */
    function mintBadge(
        address recipient,
        BadgeType badgeType,
        uint256 poolId,
        uint256 value,
        bytes calldata achievementData
    ) external override onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (!canMintBadge(badgeType)) revert BadgeNotActive();

        BadgeTemplate storage template = _badgeTemplates[badgeType];
        if (!template.isActive) revert BadgeNotActive();
        if (template.maxSupply > 0 && template.totalMinted >= template.maxSupply) {
            revert ExceedsMaxSupply();
        }

        tokenId = _nextTokenId++;

        // Determine rarity based on value and badge type
        BadgeRarity rarity = _determineRarity(badgeType, value);

        // Create achievement hash for verification
        bytes32 achievementHash = keccak256(abi.encodePacked(
            recipient,
            badgeType,
            poolId,
            value,
            block.timestamp,
            achievementData
        ));

        // Create badge info
        BadgeInfo memory badgeInfo = BadgeInfo({
            tokenId: tokenId,
            badgeType: badgeType,
            rarity: rarity,
            recipient: recipient,
            earnedAt: block.timestamp,
            poolId: poolId,
            title: template.title,
            description: template.description,
            imageURI: template.imageURI,
            value: value,
            achievementHash: achievementHash
        });

        // Store badge information
        _badges[tokenId] = badgeInfo;

        // Update template stats
        template.totalMinted++;

        // Update tracking arrays
        _badgesByType[badgeType].push(tokenId);
        _badgesByRarity[rarity].push(tokenId);
        if (poolId > 0) {
            _poolBadges[poolId].push(tokenId);
        }

        // Update user tracking
        _updateUserStats(recipient, rarity, true);
        _userTokens[recipient].push(tokenId);
        _userOwnsBadgeType[recipient][badgeType] = true;

        // Track user for leaderboard
        if (!_isUserTracked[recipient]) {
            _allUsers.push(recipient);
            _isUserTracked[recipient] = true;
        }

        // Mint the NFT
        _safeMint(recipient, tokenId);

        // Set token URI
        string memory badgeTokenURI = string(abi.encodePacked(
            _baseTokenURI,
            uint256(badgeType).toString(),
            "/",
            uint256(rarity).toString(),
            ".json"
        ));
        _setTokenURI(tokenId, badgeTokenURI);

        emit BadgeMinted(recipient, tokenId, badgeType, rarity, poolId);

        return tokenId;
    }

    /**
     * @notice Batch mint multiple badges for a user
     * @param recipient Address to receive the badges
     * @param badgeTypes Array of badge types to mint
     * @param poolIds Array of associated pool identifiers
     * @param values Array of associated values
     * @return tokenIds Array of minted token IDs
     */
    function batchMintBadges(
        address recipient,
        BadgeType[] calldata badgeTypes,
        uint256[] calldata poolIds,
        uint256[] calldata values
    ) external override onlyRole(MINTER_ROLE) whenNotPaused returns (uint256[] memory tokenIds) {
        if (badgeTypes.length != poolIds.length || badgeTypes.length != values.length) {
            revert ArrayLengthMismatch();
        }

        tokenIds = new uint256[](badgeTypes.length);

        for (uint256 i = 0; i < badgeTypes.length; i++) {
            tokenIds[i] = this.mintBadge(
                recipient,
                badgeTypes[i],
                poolIds[i],
                values[i],
                abi.encode("Batch mint", i)
            );
        }

        return tokenIds;
    }

    /**
     * @notice Update badge template configuration
     * @param badgeType Type of badge to update
     * @param template New template configuration
     */
    function updateBadgeTemplate(
        BadgeType badgeType,
        BadgeTemplate calldata template
    ) external override onlyRole(BADGE_ADMIN_ROLE) {
        if (template.badgeType != badgeType) revert InvalidTemplate();

        _badgeTemplates[badgeType] = template;

        emit BadgeTemplateUpdated(badgeType, template);
    }

    /**
     * @notice Update badge metadata (image URI)
     * @param tokenId Token identifier
     * @param newImageURI New image URI
     */
    function updateBadgeMetadata(
        uint256 tokenId,
        string calldata newImageURI
    ) external override {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotExists();
        
        // Check if caller is admin or token owner
        if (!hasRole(BADGE_ADMIN_ROLE, msg.sender) && ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwnerOrAdmin();
        }

        _badges[tokenId].imageURI = newImageURI;
        _setTokenURI(tokenId, newImageURI);

        emit BadgeMetadataUpdated(tokenId, newImageURI);
    }

    /**
     * @notice Check if user is eligible for a specific badge
     * @param badgeType Type of badge to check
     * @param value Value associated with achievement
     * @return isEligible True if user meets criteria for badge
     */
    function isEligibleForBadge(
        address /* user */,
        BadgeType badgeType,
        uint256 value
    ) external view override returns (bool isEligible) {
        BadgeTemplate storage template = _badgeTemplates[badgeType];
        
        if (!template.isActive) return false;
        if (template.maxSupply > 0 && template.totalMinted >= template.maxSupply) return false;
        if (value < template.minValue) return false;

        // Additional eligibility checks can be added here based on badge type
        return true;
    }

    /**
     * @notice Get complete badge information
     * @param tokenId Token identifier
     * @return badgeInfo Complete badge information struct
     */
    function getBadgeInfo(uint256 tokenId) external view override returns (BadgeInfo memory badgeInfo) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotExists();
        return _badges[tokenId];
    }

    /**
     * @notice Get badge template information
     * @param badgeType Type of badge
     * @return template Badge template configuration
     */
    function getBadgeTemplate(BadgeType badgeType) external view override returns (BadgeTemplate memory template) {
        return _badgeTemplates[badgeType];
    }

    /**
     * @notice Get all badges owned by a user
     * @param user Address of the user
     * @return badges Array of badge information
     */
    function getUserBadges(address user) external view override returns (BadgeInfo[] memory badges) {
        uint256[] storage userTokenIds = _userTokens[user];
        badges = new BadgeInfo[](userTokenIds.length);

        for (uint256 i = 0; i < userTokenIds.length; i++) {
            badges[i] = _badges[userTokenIds[i]];
        }

        return badges;
    }

    /**
     * @notice Get user's badge statistics
     * @param user Address of the user
     * @return stats User's badge statistics
     */
    function getUserBadgeStats(address user) external view override returns (UserBadgeStats memory stats) {
        return _userStats[user];
    }

    /**
     * @notice Get badges by type
     * @param badgeType Type of badge to filter by
     * @return badges Array of badges of specified type
     */
    function getBadgesByType(BadgeType badgeType) external view override returns (BadgeInfo[] memory badges) {
        uint256[] storage tokenIds = _badgesByType[badgeType];
        badges = new BadgeInfo[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            badges[i] = _badges[tokenIds[i]];
        }

        return badges;
    }

    /**
     * @notice Get badges by rarity
     * @param rarity Rarity level to filter by
     * @return badges Array of badges of specified rarity
     */
    function getBadgesByRarity(BadgeRarity rarity) external view override returns (BadgeInfo[] memory badges) {
        uint256[] storage tokenIds = _badgesByRarity[rarity];
        badges = new BadgeInfo[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            badges[i] = _badges[tokenIds[i]];
        }

        return badges;
    }

    /**
     * @notice Get badges associated with a specific pool
     * @param poolId Pool identifier
     * @return badges Array of pool-related badges
     */
    function getPoolBadges(uint256 poolId) external view override returns (BadgeInfo[] memory badges) {
        uint256[] storage tokenIds = _poolBadges[poolId];
        badges = new BadgeInfo[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            badges[i] = _badges[tokenIds[i]];
        }

        return badges;
    }

    /**
     * @notice Calculate reputation score for a user
     * @param user Address of the user
     * @return reputationScore Calculated reputation based on badges owned
     */
    function calculateReputationScore(address user) external view override returns (uint256 reputationScore) {
        return _userStats[user].reputationScore;
    }

    /**
     * @notice Check if user owns a specific badge type
     * @param user Address of the user
     * @param badgeType Type of badge to check
     * @return owns True if user owns at least one badge of this type
     */
    function ownsBadgeType(address user, BadgeType badgeType) external view override returns (bool owns) {
        return _userOwnsBadgeType[user][badgeType];
    }

    /**
     * @notice Get total supply of a specific badge type
     * @param badgeType Type of badge
     * @return totalSupply Total number of badges of this type minted
     */
    function getBadgeTypeSupply(BadgeType badgeType) external view override returns (uint256 totalSupply) {
        return _badgeTemplates[badgeType].totalMinted;
    }

    /**
     * @notice Get leaderboard of users by reputation score
     * @param limit Maximum number of users to return
     * @return users Array of user addresses sorted by reputation
     * @return scores Array of corresponding reputation scores
     */
    function getReputationLeaderboard(uint256 limit) external view override returns (
        address[] memory users,
        uint256[] memory scores
    ) {
        uint256 userCount = _allUsers.length;
        if (userCount == 0) {
            return (new address[](0), new uint256[](0));
        }

        // Create arrays for sorting
        address[] memory allUsers = new address[](userCount);
        uint256[] memory allScores = new uint256[](userCount);

        // Copy data
        for (uint256 i = 0; i < userCount; i++) {
            allUsers[i] = _allUsers[i];
            allScores[i] = _userStats[_allUsers[i]].reputationScore;
        }

        // Simple bubble sort (consider more efficient sorting for production)
        for (uint256 i = 0; i < userCount; i++) {
            for (uint256 j = i + 1; j < userCount; j++) {
                if (allScores[i] < allScores[j]) {
                    // Swap scores
                    uint256 tempScore = allScores[i];
                    allScores[i] = allScores[j];
                    allScores[j] = tempScore;

                    // Swap users
                    address tempUser = allUsers[i];
                    allUsers[i] = allUsers[j];
                    allUsers[j] = tempUser;
                }
            }
        }

        // Return top users up to limit
        uint256 resultCount = userCount < limit ? userCount : limit;
        users = new address[](resultCount);
        scores = new uint256[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            users[i] = allUsers[i];
            scores[i] = allScores[i];
        }

        return (users, scores);
    }

    /**
     * @notice Get rarity multiplier for reputation calculation
     * @param rarity Badge rarity level
     * @return multiplier Numerical multiplier for reputation calculation
     */
    function getRarityMultiplier(BadgeRarity rarity) external pure override returns (uint256 multiplier) {
        if (rarity == BadgeRarity.Common) return 1;
        if (rarity == BadgeRarity.Uncommon) return 2;
        if (rarity == BadgeRarity.Rare) return 5;
        if (rarity == BadgeRarity.Epic) return 10;
        if (rarity == BadgeRarity.Legendary) return 25;
        return 1; // Default to common multiplier
    }

    /**
     * @notice Check if badge can still be minted (supply limit)
     * @param badgeType Type of badge to check
     * @return canMint True if badge can still be minted
     */
    function canMintBadge(BadgeType badgeType) public view override returns (bool canMint) {
        BadgeTemplate storage template = _badgeTemplates[badgeType];
        if (!template.isActive) return false;
        if (template.maxSupply == 0) return true; // Unlimited supply
        return template.totalMinted < template.maxSupply;
    }

    /**
     * @notice Get next available token ID
     * @return tokenId Next token ID that will be minted
     */
    function getNextTokenId() external view override returns (uint256 tokenId) {
        return _nextTokenId;
    }

    /**
     * @notice Determine badge rarity based on type and value
     * @param badgeType Type of badge
     * @param value Associated value
     * @return rarity Determined rarity level
     */
    function _determineRarity(BadgeType badgeType, uint256 value) internal pure returns (BadgeRarity rarity) {
        // Rarity determination logic based on badge type and value
        if (badgeType == BadgeType.LotteryWinner) {
            if (value >= 10 ether) return BadgeRarity.Legendary;
            if (value >= 5 ether) return BadgeRarity.Epic;
            if (value >= 1 ether) return BadgeRarity.Rare;
            if (value >= 0.1 ether) return BadgeRarity.Uncommon;
            return BadgeRarity.Common;
        } else if (badgeType == BadgeType.HighYielder) {
            if (value >= 100 ether) return BadgeRarity.Legendary;
            if (value >= 50 ether) return BadgeRarity.Epic;
            if (value >= 10 ether) return BadgeRarity.Rare;
            if (value >= 1 ether) return BadgeRarity.Uncommon;
            return BadgeRarity.Common;
        } else if (badgeType == BadgeType.PoolCreator || badgeType == BadgeType.TrustBuilder) {
            if (value >= 100) return BadgeRarity.Legendary; // 100+ successful pools
            if (value >= 50) return BadgeRarity.Epic;       // 50+ successful pools
            if (value >= 10) return BadgeRarity.Rare;       // 10+ successful pools
            if (value >= 5) return BadgeRarity.Uncommon;    // 5+ successful pools
            return BadgeRarity.Common;                      // First pool
        } else {
            // Default rarity for other badge types
            return BadgeRarity.Common;
        }
    }

    /**
     * @notice Update user statistics when earning a badge
     * @param user Address of the user
     * @param rarity Rarity of the earned badge
     * @param isNewBadge True if this is a new badge (not a transfer)
     */
    function _updateUserStats(address user, BadgeRarity rarity, bool isNewBadge) internal {
        UserBadgeStats storage stats = _userStats[user];

        if (isNewBadge) {
            stats.totalBadges++;

            // Update rarity counts
            if (rarity == BadgeRarity.Common) stats.commonCount++;
            else if (rarity == BadgeRarity.Uncommon) stats.uncommonCount++;
            else if (rarity == BadgeRarity.Rare) stats.rareCount++;
            else if (rarity == BadgeRarity.Epic) stats.epicCount++;
            else if (rarity == BadgeRarity.Legendary) stats.legendaryCount++;

            // Calculate reputation score
            stats.reputationScore += _rarityMultipliers[rarity];

            emit ReputationUpdated(user, stats.reputationScore, stats.totalBadges);
        }
    }

    /**
     * @notice Initialize default badge templates
     */
    function _initializeDefaultTemplates() internal {
        // Pool Creator Badge
        _badgeTemplates[BadgeType.PoolCreator] = BadgeTemplate({
            badgeType: BadgeType.PoolCreator,
            rarity: BadgeRarity.Common,
            title: "Pool Creator",
            description: "Created a savings pool",
            imageURI: "pool-creator.json",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Early Joiner Badge
        _badgeTemplates[BadgeType.EarlyJoiner] = BadgeTemplate({
            badgeType: BadgeType.EarlyJoiner,
            rarity: BadgeRarity.Common,
            title: "Early Joiner",
            description: "Joined a pool among the first 3 members",
            imageURI: "early-joiner.json",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // Lottery Winner Badge
        _badgeTemplates[BadgeType.LotteryWinner] = BadgeTemplate({
            badgeType: BadgeType.LotteryWinner,
            rarity: BadgeRarity.Uncommon,
            title: "Lottery Winner",
            description: "Won a lottery draw",
            imageURI: "lottery-winner.json",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // Pool Completer Badge
        _badgeTemplates[BadgeType.PoolCompleter] = BadgeTemplate({
            badgeType: BadgeType.PoolCompleter,
            rarity: BadgeRarity.Common,
            title: "Pool Completer",
            description: "Successfully completed a savings pool",
            imageURI: "pool-completer.json",
            minValue: 0,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // High Yielder Badge
        _badgeTemplates[BadgeType.HighYielder] = BadgeTemplate({
            badgeType: BadgeType.HighYielder,
            rarity: BadgeRarity.Rare,
            title: "High Yielder",
            description: "Earned significant yield from pools",
            imageURI: "high-yielder.json",
            minValue: 1 ether,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0
        });

        // Veteran Badge
        _badgeTemplates[BadgeType.Veteran] = BadgeTemplate({
            badgeType: BadgeType.Veteran,
            rarity: BadgeRarity.Epic,
            title: "Veteran",
            description: "Long-term platform participant",
            imageURI: "veteran.json",
            minValue: 10, // 10+ completed pools
            isActive: true,
            totalMinted: 0,
            maxSupply: 1000 // Limited supply
        });

        // Social Influencer Badge
        _badgeTemplates[BadgeType.SocialInfluencer] = BadgeTemplate({
            badgeType: BadgeType.SocialInfluencer,
            rarity: BadgeRarity.Rare,
            title: "Social Influencer",
            description: "Referred multiple users to the platform",
            imageURI: "social-influencer.json",
            minValue: 5, // 5+ referrals
            isActive: true,
            totalMinted: 0,
            maxSupply: 500
        });

        // Trust Builder Badge
        _badgeTemplates[BadgeType.TrustBuilder] = BadgeTemplate({
            badgeType: BadgeType.TrustBuilder,
            rarity: BadgeRarity.Epic,
            title: "Trust Builder",
            description: "Created multiple successful pools",
            imageURI: "trust-builder.json",
            minValue: 5, // 5+ successful pools
            isActive: true,
            totalMinted: 0,
            maxSupply: 100
        });
    }

    /**
     * @notice Emergency pause function
     */
    function pause() external onlyRole(BADGE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Emergency unpause function
     */
    function unpause() external onlyRole(BADGE_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Set base URI for badge metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string calldata newBaseURI) external onlyRole(BADGE_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }

    /**
     * @notice Get base URI
     * @return Base URI for metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Override tokenURI to use our custom logic
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Override supportsInterface for access control
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Override _update to handle user stats on transfer
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);

        // Handle badge transfers (update user tracking)
        if (from != address(0) && to != address(0) && from != to) {
            // Remove from old owner's tracking
            uint256[] storage fromTokens = _userTokens[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }

            // Add to new owner's tracking
            _userTokens[to].push(tokenId);

            // Update badge type ownership
            BadgeType badgeType = _badges[tokenId].badgeType;
            
            // Check if old owner still has this badge type
            bool stillOwns = false;
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (_badges[fromTokens[i]].badgeType == badgeType) {
                    stillOwns = true;
                    break;
                }
            }
            if (!stillOwns) {
                _userOwnsBadgeType[from][badgeType] = false;
            }

            // Set for new owner
            _userOwnsBadgeType[to][badgeType] = true;

            // Track new user if needed
            if (!_isUserTracked[to]) {
                _allUsers.push(to);
                _isUserTracked[to] = true;
            }
        }

        return previousOwner;
    }
}
