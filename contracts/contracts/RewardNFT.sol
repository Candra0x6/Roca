// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IBadge.sol";

/**
 * @title RewardNFT
 * @author Arisan+ Team
 * @notice Achievement badge NFT system for Arisan+ platform gamification
 * @dev Implements IBadge interface with ERC721 functionality for user milestones
 */
contract RewardNFT is IBadge, ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role identifier for badge minters (Pool, Lottery contracts)
    bytes32 public constant BADGE_MINTER_ROLE = keccak256("BADGE_MINTER_ROLE");
    
    /// @notice Role identifier for badge admins
    bytes32 public constant BADGE_ADMIN_ROLE = keccak256("BADGE_ADMIN_ROLE");

    /// @notice Counter for unique token IDs
    uint256 private _nextTokenId;
    
    /// @notice Mapping from token ID to badge information
    mapping(uint256 => BadgeInfo) private _badges;
    
    /// @notice Mapping from badge type to template configuration
    mapping(BadgeType => BadgeTemplate) private _badgeTemplates;
    
    /// @notice Mapping from user address to badge statistics
    mapping(address => UserBadgeStats) private _userStats;
    
    /// @notice Mapping from user to array of owned token IDs
    mapping(address => uint256[]) private _userTokens;
    
    /// @notice Mapping from badge type to array of token IDs
    mapping(BadgeType => uint256[]) private _badgeTypeTokens;
    
    /// @notice Mapping from rarity to array of token IDs
    mapping(BadgeRarity => uint256[]) private _rarityTokens;
    
    /// @notice Mapping from pool ID to array of associated badge token IDs
    mapping(uint256 => uint256[]) private _poolBadges;
    
    /// @notice Mapping to track if user already has a specific badge type
    mapping(address => mapping(BadgeType => bool)) private _userHasBadgeType;

    /// @notice Custom errors for gas efficiency
    error InvalidBadgeType(BadgeType badgeType);
    error BadgeNotActive(BadgeType badgeType);
    error InsufficientValue(uint256 required, uint256 provided);
    error MaxSupplyReached(BadgeType badgeType);
    error BadgeNotFound(uint256 tokenId);
    error UnauthorizedMinter(address caller);
    error InvalidArrayLength();
    error BadgeAlreadyOwned(address user, BadgeType badgeType);

    /**
     * @notice Constructor initializes the badge NFT system
     * @param admin Address of the initial admin
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     */
    constructor(
        address admin,
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        if (admin == address(0)) revert InvalidBadgeType(BadgeType.PoolCreator);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BADGE_ADMIN_ROLE, admin);
        
        _nextTokenId = 1;
        
        // Initialize default badge templates
        _initializeBadgeTemplates();
    }

    /**
     * @notice Mint a badge for a user achievement
     * @param recipient Address to receive the badge
     * @param badgeType Type of badge to mint
     * @param poolId Associated pool identifier (use 0 if not pool-specific)
     * @param value Associated value for the achievement
     * @param achievementData Additional data about the achievement
     * @dev Only callable by authorized contracts (Pool, Lottery, etc.)
     */
    function mintBadge(
        address recipient,
        BadgeType badgeType,
        uint256 poolId,
        uint256 value,
        bytes calldata achievementData
    ) external override onlyRole(BADGE_MINTER_ROLE) whenNotPaused nonReentrant returns (uint256 tokenId) {
        return _mintSingleBadge(recipient, badgeType, poolId, value, achievementData);
    }

    /**
     * @notice Internal function to mint a single badge
     * @param recipient Address to receive the badge
     * @param badgeType Type of badge to mint
     * @param poolId Associated pool identifier (use 0 if not pool-specific)
     * @param value Associated value for the achievement
     * @param achievementData Additional data about the achievement
     */
    function _mintSingleBadge(
        address recipient,
        BadgeType badgeType,
        uint256 poolId,
        uint256 value,
        bytes memory achievementData
    ) internal returns (uint256 tokenId) {
        if (recipient == address(0)) revert InvalidBadgeType(badgeType);
        
        BadgeTemplate storage template = _badgeTemplates[badgeType];
        if (!template.isActive) revert BadgeNotActive(badgeType);
        
        // Check value requirements
        if (value < template.minValue) {
            revert InsufficientValue(template.minValue, value);
        }
        
        // Check supply limits
        if (template.maxSupply > 0 && template.totalMinted >= template.maxSupply) {
            revert MaxSupplyReached(badgeType);
        }
        
        // Check if user already has this badge type (for unique badges)
        if (_isUniqueBadgeType(badgeType) && _userHasBadgeType[recipient][badgeType]) {
            revert BadgeAlreadyOwned(recipient, badgeType);
        }
        
        tokenId = _nextTokenId++;
        
        // Create badge information
        bytes32 achievementHash = keccak256(abi.encodePacked(
            recipient,
            badgeType,
            poolId,
            value,
            block.timestamp,
            achievementData
        ));
        
        BadgeInfo memory badgeInfo = BadgeInfo({
            tokenId: tokenId,
            badgeType: badgeType,
            rarity: template.rarity,
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
        
        // Update template statistics
        template.totalMinted++;
        
        // Update user tracking
        _userTokens[recipient].push(tokenId);
        _userHasBadgeType[recipient][badgeType] = true;
        
        // Update categorization mappings
        _badgeTypeTokens[badgeType].push(tokenId);
        _rarityTokens[template.rarity].push(tokenId);
        
        if (poolId > 0) {
            _poolBadges[poolId].push(tokenId);
        }
        
        // Update user statistics
        _updateUserStats(recipient, template.rarity);
        
        // Mint the NFT
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, template.imageURI);
        
        emit BadgeMinted(recipient, tokenId, badgeType, template.rarity, poolId);
        
        return tokenId;
    }

    /**
     * @notice Batch mint multiple badges for a user
     * @param recipient Address to receive the badges
     * @param badgeTypes Array of badge types to mint
     * @param poolIds Array of associated pool identifiers
     * @param values Array of associated values
     * @dev Efficient batch minting for multiple achievements
     */
    function batchMintBadges(
        address recipient,
        BadgeType[] calldata badgeTypes,
        uint256[] calldata poolIds,
        uint256[] calldata values
    ) external override onlyRole(BADGE_MINTER_ROLE) whenNotPaused nonReentrant returns (uint256[] memory tokenIds) {
        if (badgeTypes.length != poolIds.length || badgeTypes.length != values.length) {
            revert InvalidArrayLength();
        }
        
        tokenIds = new uint256[](badgeTypes.length);
        
        for (uint256 i = 0; i < badgeTypes.length; i++) {
            tokenIds[i] = _mintSingleBadge(recipient, badgeTypes[i], poolIds[i], values[i], new bytes(0));
        }
        
        return tokenIds;
    }

    /**
     * @notice Update badge template configuration
     * @param badgeType Type of badge to update
     * @param template New template configuration
     * @dev Only callable by admin
     */
    function updateBadgeTemplate(
        BadgeType badgeType,
        BadgeTemplate calldata template
    ) external override onlyRole(BADGE_ADMIN_ROLE) {
        _badgeTemplates[badgeType] = template;
        emit BadgeTemplateUpdated(badgeType, template);
    }

    /**
     * @notice Update badge metadata (image URI)
     * @param tokenId Token identifier
     * @param newImageURI New image URI
     * @dev Only callable by admin or token owner
     */
    function updateBadgeMetadata(
        uint256 tokenId,
        string calldata newImageURI
    ) external override {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound(tokenId);
        
        if (!hasRole(BADGE_ADMIN_ROLE, msg.sender) && ownerOf(tokenId) != msg.sender) {
            revert UnauthorizedMinter(msg.sender);
        }
        
        _badges[tokenId].imageURI = newImageURI;
        _setTokenURI(tokenId, newImageURI);
        
        emit BadgeMetadataUpdated(tokenId, newImageURI);
    }

    /**
     * @notice Check if user is eligible for a specific badge
     * @param user Address to check eligibility for
     * @param badgeType Type of badge to check
     * @param value Value associated with achievement
     * @return isEligible True if user meets criteria for badge
     */
    function isEligibleForBadge(
        address user,
        BadgeType badgeType,
        uint256 value
    ) external view override returns (bool isEligible) {
        BadgeTemplate storage template = _badgeTemplates[badgeType];
        
        if (!template.isActive) return false;
        if (value < template.minValue) return false;
        if (template.maxSupply > 0 && template.totalMinted >= template.maxSupply) return false;
        if (_isUniqueBadgeType(badgeType) && _userHasBadgeType[user][badgeType]) return false;
        
        return true;
    }

    /**
     * @notice Get complete badge information
     * @param tokenId Token identifier
     * @return badgeInfo Complete badge information struct
     */
    function getBadgeInfo(uint256 tokenId) external view override returns (BadgeInfo memory badgeInfo) {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound(tokenId);
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
        uint256[] storage tokenIds = _badgeTypeTokens[badgeType];
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
        uint256[] storage tokenIds = _rarityTokens[rarity];
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
        UserBadgeStats storage stats = _userStats[user];
        
        reputationScore = 
            (stats.commonCount * getRarityMultiplier(BadgeRarity.Common)) +
            (stats.uncommonCount * getRarityMultiplier(BadgeRarity.Uncommon)) +
            (stats.rareCount * getRarityMultiplier(BadgeRarity.Rare)) +
            (stats.epicCount * getRarityMultiplier(BadgeRarity.Epic)) +
            (stats.legendaryCount * getRarityMultiplier(BadgeRarity.Legendary));
        
        return reputationScore;
    }

    /**
     * @notice Check if user owns a specific badge type
     * @param user Address of the user
     * @param badgeType Type of badge to check
     * @return owns True if user owns at least one badge of this type
     */
    function ownsBadgeType(address user, BadgeType badgeType) external view override returns (bool owns) {
        return _userHasBadgeType[user][badgeType];
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
     * @return users Array of user addresses sorted by reputation
     * @return scores Array of corresponding reputation scores
     */
    function getReputationLeaderboard(uint256 /* limit */) external view override returns (
        address[] memory users,
        uint256[] memory scores
    ) {
        // Simple implementation - in production, consider using a more efficient ranking system
        uint256 totalUsers = 0;
        
        // Count users with badges (this is a simplified approach)
        // In production, you'd maintain a separate list of users
        for (uint256 i = 1; i < _nextTokenId; i++) {
            if (_ownerOf(i) != address(0)) {
                totalUsers++;
            }
        }
        
        // For MVP, return empty arrays - full implementation would require
        // maintaining a sorted list of users by reputation
        users = new address[](0);
        scores = new uint256[](0);
        
        return (users, scores);
    }

    /**
     * @notice Get rarity multiplier for reputation calculation
     * @param rarity Badge rarity level
     * @return multiplier Numerical multiplier for reputation calculation
     */
    function getRarityMultiplier(BadgeRarity rarity) public pure override returns (uint256 multiplier) {
        if (rarity == BadgeRarity.Common) return 1;
        if (rarity == BadgeRarity.Uncommon) return 3;
        if (rarity == BadgeRarity.Rare) return 10;
        if (rarity == BadgeRarity.Epic) return 30;
        if (rarity == BadgeRarity.Legendary) return 100;
        return 1;
    }

    /**
     * @notice Check if badge can still be minted (supply limit)
     * @param badgeType Type of badge to check
     * @return canMint True if badge can still be minted
     */
    function canMintBadge(BadgeType badgeType) external view override returns (bool canMint) {
        BadgeTemplate storage template = _badgeTemplates[badgeType];
        if (!template.isActive) return false;
        if (template.maxSupply > 0 && template.totalMinted >= template.maxSupply) return false;
        return true;
    }

    /**
     * @notice Get next available token ID
     * @return tokenId Next token ID that will be minted
     */
    function getNextTokenId() external view override returns (uint256 tokenId) {
        return _nextTokenId;
    }

    /**
     * @notice Initialize default badge templates
     * @dev Sets up the initial badge configurations
     */
    function _initializeBadgeTemplates() internal {
        // Pool Creator Badge
        _badgeTemplates[BadgeType.PoolCreator] = BadgeTemplate({
            badgeType: BadgeType.PoolCreator,
            rarity: BadgeRarity.Uncommon,
            title: "Pool Creator",
            description: "Created your first savings pool",
            imageURI: "https://badges.arisan.plus/pool-creator.json",
            minValue: 1,
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
            imageURI: "https://badges.arisan.plus/early-joiner.json",
            minValue: 1,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Lottery Winner Badge
        _badgeTemplates[BadgeType.LotteryWinner] = BadgeTemplate({
            badgeType: BadgeType.LotteryWinner,
            rarity: BadgeRarity.Rare,
            title: "Lottery Winner",
            description: "Won a weekly lottery draw",
            imageURI: "https://badges.arisan.plus/lottery-winner.json",
            minValue: 1,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Pool Completer Badge
        _badgeTemplates[BadgeType.PoolCompleter] = BadgeTemplate({
            badgeType: BadgeType.PoolCompleter,
            rarity: BadgeRarity.Common,
            title: "Pool Completer",
            description: "Successfully completed a savings pool",
            imageURI: "https://badges.arisan.plus/pool-completer.json",
            minValue: 1,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // High Yielder Badge
        _badgeTemplates[BadgeType.HighYielder] = BadgeTemplate({
            badgeType: BadgeType.HighYielder,
            rarity: BadgeRarity.Epic,
            title: "High Yielder",
            description: "Earned significant yield from DeFi strategies",
            imageURI: "https://badges.arisan.plus/high-yielder.json",
            minValue: 1 ether, // Minimum 1 ETH yield
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Veteran Badge
        _badgeTemplates[BadgeType.Veteran] = BadgeTemplate({
            badgeType: BadgeType.Veteran,
            rarity: BadgeRarity.Epic,
            title: "Veteran",
            description: "Participated in 10+ pools",
            imageURI: "https://badges.arisan.plus/veteran.json",
            minValue: 10,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Social Influencer Badge
        _badgeTemplates[BadgeType.SocialInfluencer] = BadgeTemplate({
            badgeType: BadgeType.SocialInfluencer,
            rarity: BadgeRarity.Rare,
            title: "Social Influencer",
            description: "Referred 5+ users to the platform",
            imageURI: "https://badges.arisan.plus/social-influencer.json",
            minValue: 5,
            isActive: true,
            totalMinted: 0,
            maxSupply: 0 // Unlimited
        });

        // Trust Builder Badge
        _badgeTemplates[BadgeType.TrustBuilder] = BadgeTemplate({
            badgeType: BadgeType.TrustBuilder,
            rarity: BadgeRarity.Legendary,
            title: "Trust Builder",
            description: "Created 5+ successful pools with 100% completion rate",
            imageURI: "https://badges.arisan.plus/trust-builder.json",
            minValue: 5,
            isActive: true,
            totalMinted: 0,
            maxSupply: 100 // Limited edition
        });
    }

    /**
     * @notice Update user statistics when earning a new badge
     * @param user Address of the user
     * @param rarity Rarity of the new badge
     */
    function _updateUserStats(address user, BadgeRarity rarity) internal {
        UserBadgeStats storage stats = _userStats[user];
        stats.totalBadges++;
        
        if (rarity == BadgeRarity.Common) stats.commonCount++;
        else if (rarity == BadgeRarity.Uncommon) stats.uncommonCount++;
        else if (rarity == BadgeRarity.Rare) stats.rareCount++;
        else if (rarity == BadgeRarity.Epic) stats.epicCount++;
        else if (rarity == BadgeRarity.Legendary) stats.legendaryCount++;
        
        // Calculate new reputation score
        stats.reputationScore = 
            (stats.commonCount * getRarityMultiplier(BadgeRarity.Common)) +
            (stats.uncommonCount * getRarityMultiplier(BadgeRarity.Uncommon)) +
            (stats.rareCount * getRarityMultiplier(BadgeRarity.Rare)) +
            (stats.epicCount * getRarityMultiplier(BadgeRarity.Epic)) +
            (stats.legendaryCount * getRarityMultiplier(BadgeRarity.Legendary));
        
        emit ReputationUpdated(user, stats.reputationScore, stats.totalBadges);
    }

    /**
     * @notice Check if a badge type should be unique per user
     * @param badgeType Type of badge to check
     * @return isUnique True if only one badge of this type per user
     */
    function _isUniqueBadgeType(BadgeType badgeType) internal pure returns (bool isUnique) {
        // Some badges can be earned multiple times, others are unique
        return badgeType == BadgeType.PoolCreator ||
               badgeType == BadgeType.Veteran ||
               badgeType == BadgeType.SocialInfluencer ||
               badgeType == BadgeType.TrustBuilder;
    }

    /**
     * @notice Emergency pause function
     * @dev Only callable by admin in case of critical issues
     */
    function emergencyPause() external onlyRole(BADGE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Emergency unpause function
     * @dev Only callable by admin after issues are resolved
     */
    function emergencyUnpause() external onlyRole(BADGE_ADMIN_ROLE) {
        _unpause();
    }

    // Required overrides for multiple inheritance
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
