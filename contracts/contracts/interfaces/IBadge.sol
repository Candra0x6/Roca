// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IBadge
 * @author Roca Team
 * @notice Interface for Roca achievement badge NFT system
 * @dev Extends ERC721 for gamification and user recognition
 */
interface IBadge is IERC721 {
    /// @notice Types of badges that can be earned
    enum BadgeType {
        PoolCreator,      // Badge for creating a pool
        EarlyJoiner,      // Badge for joining pool early
        LotteryWinner,    // Badge for winning lottery draw
        PoolCompleter,    // Badge for completing a pool
        HighYielder,      // Badge for earning significant yield
        Veteran,          // Badge for long-term participation
        SocialInfluencer, // Badge for referring multiple users
        TrustBuilder      // Badge for creating successful pools
    }

    /// @notice Badge rarity levels
    enum BadgeRarity {
        Common,    // Standard achievement badge
        Uncommon,  // Notable achievement badge
        Rare,      // Significant achievement badge
        Epic,      // Outstanding achievement badge
        Legendary  // Exceptional achievement badge
    }

    /// @notice Complete badge information
    struct BadgeInfo {
        uint256 tokenId;          // Unique token identifier
        BadgeType badgeType;      // Type of badge earned
        BadgeRarity rarity;       // Rarity level of the badge
        address recipient;        // Address that earned the badge
        uint256 earnedAt;         // Timestamp when badge was earned
        uint256 poolId;           // Associated pool (if applicable)
        string title;             // Human-readable badge title
        string description;       // Detailed badge description
        string imageURI;          // URI for badge image
        uint256 value;            // Associated value (yield, prize, etc.)
        bytes32 achievementHash;  // Hash of achievement data for verification
    }

    /// @notice Badge earning criteria and metadata
    struct BadgeTemplate {
        BadgeType badgeType;      // Type of badge
        BadgeRarity rarity;       // Rarity level
        string title;             // Badge title
        string description;       // Badge description
        string imageURI;          // Badge image URI
        uint256 minValue;         // Minimum value required to earn
        bool isActive;            // Whether badge can be earned
        uint256 totalMinted;      // Total number minted
        uint256 maxSupply;        // Maximum supply (0 for unlimited)
    }

    /// @notice User's badge statistics
    struct UserBadgeStats {
        uint256 totalBadges;      // Total badges owned
        uint256 commonCount;      // Number of common badges
        uint256 uncommonCount;    // Number of uncommon badges
        uint256 rareCount;        // Number of rare badges
        uint256 epicCount;        // Number of epic badges
        uint256 legendaryCount;   // Number of legendary badges
        uint256 reputationScore;  // Calculated reputation based on badges
    }

    /// @notice Emitted when a new badge is minted
    /// @param recipient Address receiving the badge
    /// @param tokenId Unique token identifier
    /// @param badgeType Type of badge minted
    /// @param rarity Rarity level of the badge
    /// @param poolId Associated pool identifier (if applicable)
    event BadgeMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        BadgeType indexed badgeType,
        BadgeRarity rarity,
        uint256 poolId
    );

    /// @notice Emitted when badge template is updated
    /// @param badgeType Type of badge updated
    /// @param template New template information
    event BadgeTemplateUpdated(BadgeType indexed badgeType, BadgeTemplate template);

    /// @notice Emitted when badge metadata is updated
    /// @param tokenId Token identifier
    /// @param newImageURI New image URI
    event BadgeMetadataUpdated(uint256 indexed tokenId, string newImageURI);

    /// @notice Emitted when user's reputation score is updated
    /// @param user Address of the user
    /// @param newScore New reputation score
    /// @param badgeCount Total badge count
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 badgeCount);

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
    ) external returns (uint256 tokenId);

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
    ) external returns (uint256[] memory tokenIds);

    /**
     * @notice Update badge template configuration
     * @param badgeType Type of badge to update
     * @param template New template configuration
     * @dev Only callable by admin
     */
    function updateBadgeTemplate(BadgeType badgeType, BadgeTemplate calldata template) external;

    /**
     * @notice Update badge metadata (image URI)
     * @param tokenId Token identifier
     * @param newImageURI New image URI
     * @dev Only callable by admin or token owner
     */
    function updateBadgeMetadata(uint256 tokenId, string calldata newImageURI) external;

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
    ) external view returns (bool isEligible);

    /**
     * @notice Get complete badge information
     * @param tokenId Token identifier
     * @return badgeInfo Complete badge information struct
     */
    function getBadgeInfo(uint256 tokenId) external view returns (BadgeInfo memory badgeInfo);

    /**
     * @notice Get badge template information
     * @param badgeType Type of badge
     * @return template Badge template configuration
     */
    function getBadgeTemplate(BadgeType badgeType) external view returns (BadgeTemplate memory template);

    /**
     * @notice Get all badges owned by a user
     * @param user Address of the user
     * @return badges Array of badge information
     */
    function getUserBadges(address user) external view returns (BadgeInfo[] memory badges);

    /**
     * @notice Get user's badge statistics
     * @param user Address of the user
     * @return stats User's badge statistics
     */
    function getUserBadgeStats(address user) external view returns (UserBadgeStats memory stats);

    /**
     * @notice Get badges by type
     * @param badgeType Type of badge to filter by
     * @return badges Array of badges of specified type
     */
    function getBadgesByType(BadgeType badgeType) external view returns (BadgeInfo[] memory badges);

    /**
     * @notice Get badges by rarity
     * @param rarity Rarity level to filter by
     * @return badges Array of badges of specified rarity
     */
    function getBadgesByRarity(BadgeRarity rarity) external view returns (BadgeInfo[] memory badges);

    /**
     * @notice Get badges associated with a specific pool
     * @param poolId Pool identifier
     * @return badges Array of pool-related badges
     */
    function getPoolBadges(uint256 poolId) external view returns (BadgeInfo[] memory badges);

    /**
     * @notice Calculate reputation score for a user
     * @param user Address of the user
     * @return reputationScore Calculated reputation based on badges owned
     */
    function calculateReputationScore(address user) external view returns (uint256 reputationScore);

    /**
     * @notice Check if user owns a specific badge type
     * @param user Address of the user
     * @param badgeType Type of badge to check
     * @return owns True if user owns at least one badge of this type
     */
    function ownsBadgeType(address user, BadgeType badgeType) external view returns (bool owns);

    /**
     * @notice Get total supply of a specific badge type
     * @param badgeType Type of badge
     * @return totalSupply Total number of badges of this type minted
     */
    function getBadgeTypeSupply(BadgeType badgeType) external view returns (uint256 totalSupply);

    /**
     * @notice Get leaderboard of users by reputation score
     * @param limit Maximum number of users to return
     * @return users Array of user addresses sorted by reputation
     * @return scores Array of corresponding reputation scores
     */
    function getReputationLeaderboard(uint256 limit) external view returns (
        address[] memory users,
        uint256[] memory scores
    );

    /**
     * @notice Get rarity multiplier for reputation calculation
     * @param rarity Badge rarity level
     * @return multiplier Numerical multiplier for reputation calculation
     */
    function getRarityMultiplier(BadgeRarity rarity) external pure returns (uint256 multiplier);

    /**
     * @notice Check if badge can still be minted (supply limit)
     * @param badgeType Type of badge to check
     * @return canMint True if badge can still be minted
     */
    function canMintBadge(BadgeType badgeType) external view returns (bool canMint);

    /**
     * @notice Get next available token ID
     * @return tokenId Next token ID that will be minted
     */
    function getNextTokenId() external view returns (uint256 tokenId);
}
