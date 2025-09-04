import { Address } from 'viem'

// Pool States
export enum PoolState {
  Open = 0,
  Locked = 1,
  Active = 2,
  Completed = 3
}

// Pool Data Structures
export interface PoolInfo {
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  duration: bigint
  creator: Address
  createdAt: bigint
  state: PoolState
  currentMembers: bigint
  totalContributions: bigint
  yieldGenerated: bigint
  endTime: bigint
  yieldManager: Address
  badgeContract: Address
}

export interface PoolMember {
  member: Address
  joinedAt: bigint
  hasWithdrawn: boolean
  contributionAmount: bigint
}

// Lottery Data Structures
export interface LotteryRound {
  pool: Address
  round: bigint
  winner: Address
  prizeAmount: bigint
  timestamp: bigint
  participants: Address[]
}

// Badge Types
export enum BadgeType {
  JoinBadge = 0,
  LotteryWinnerBadge = 1,
  PoolCompletionBadge = 2
}

export interface BadgeMetadata {
  tokenId: bigint
  badgeType: BadgeType
  poolAddress: Address
  recipient: Address
  timestamp: bigint
}

// Yield Manager Data
export interface YieldInfo {
  pool: Address
  principal: bigint
  yieldGenerated: bigint
  lastUpdateTime: bigint
  isActive: boolean
}

// Contract Read Functions Return Types
export interface PoolFactoryData {
  pools: Address[]
  poolCount: bigint
  userPools: Address[]
  maxPoolSize: bigint
}

export interface PoolDetails extends PoolInfo {
  members: PoolMember[]
  memberAddresses: Address[]
  isUserMember: boolean
  userMembership?: PoolMember
}

// Events Types
export interface PoolCreatedEvent {
  pool: Address
  creator: Address
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  duration: bigint
}

export interface MemberJoinedEvent {
  pool: Address
  member: Address
  contributionAmount: bigint
  timestamp: bigint
}

export interface PoolStateChangedEvent {
  pool: Address
  from: PoolState
  to: PoolState
  timestamp: bigint
}

export interface LotteryDrawnEvent {
  pool: Address
  round: bigint
  winner: Address
  prizeAmount: bigint
  participants: Address[]
}

export interface YieldUpdatedEvent {
  pool: Address
  newYield: bigint
  totalYield: bigint
  timestamp: bigint
}

export interface BadgeMintedEvent {
  recipient: Address
  tokenId: bigint
  badgeType: BadgeType
  poolAddress: Address
}

// Transaction Types
export interface CreatePoolParams {
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  duration: bigint
}

export interface JoinPoolParams {
  poolAddress: Address
  value: bigint
}

// Hook Return Types
export interface UsePoolFactoryReturn {
  pools: Address[]
  createPool: (params: CreatePoolParams) => Promise<Address>
  getUserPools: (userAddress: Address) => Promise<Address[]>
  getPoolById: (poolId: bigint) => Promise<Address | null>
  isLoading: boolean
  error: Error | null
}

export interface UsePoolReturn {
  poolInfo: PoolDetails | null
  joinPool: () => Promise<void>
  leavePool: () => Promise<void>
  withdrawShare: () => Promise<void>
  completePool: () => Promise<void>
  triggerCompletion: () => Promise<void>
  refetch: () => Promise<void>
  isLoading: boolean
  error: Error | null
  canJoin: boolean
  canLeave: boolean
  canWithdraw: boolean
}

export interface UseBadgeReturn {
  badges: BadgeMetadata[]
  getBadge: (tokenId: bigint) => Promise<BadgeMetadata | null>
  isLoading: boolean
  error: Error | null
}

export interface UseLotteryReturn {
  currentRound: LotteryRound | null
  pastRounds: LotteryRound[]
  drawLottery: (poolAddress: Address) => Promise<void>
  getLotteryHistory: (poolAddress: Address) => Promise<LotteryRound[]>
  isLoading: boolean
  error: Error | null
}

export interface UseYieldManagerReturn {
  yieldInfo: YieldInfo | null
  updateYield: (poolAddress: Address) => Promise<void>
  stakeFunds: (poolAddress: Address, amount: bigint) => Promise<void>
  unstakeFunds: (poolAddress: Address) => Promise<void>
  isLoading: boolean
  error: Error | null
}

// Contract Configuration
export interface ContractConfig {
  address: Address
  abi: any[]
  chainId?: number
}

// Wagmi Hook Configuration Types
export type PoolFactoryConfig = ContractConfig
export type PoolConfig = ContractConfig
export type BadgeConfig = ContractConfig
export type LotteryManagerConfig = ContractConfig
export type YieldManagerConfig = ContractConfig
export type RewardNFTConfig = ContractConfig