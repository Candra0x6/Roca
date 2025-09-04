// Main contract hooks
export { usePoolFactory, useCreatePool, usePoolStatistics, useUserPools } from './usePoolFactory'
export { usePool, useJoinPool, useWithdrawalInfo } from './usePool'
export { useBadge, useBadgeMetadata, useHasBadge } from './useBadge'
export { useLottery, useCanDrawLottery, useLotteryStatistics } from './useLottery'
export { useYieldManager, useYieldAPY, useTotalYield, useIsPoolStaked } from './useYieldManager'

// Pool-specific hooks
export { usePoolId } from './usePoolId'
export { usePoolYield } from './usePoolYield'

// Dashboard and analytics hooks
export { useDashboard } from './useDashboard'
export { useYieldTracking } from './useYieldTracking'

// Pool detail hooks
export { usePoolAddress } from './usePoolAddress'
export { usePoolDetail } from './usePoolDetail'

// Developer tools hooks
export { useTimeSimulation } from './useTimeSimulation'

// Wallet connection hooks
export { useWalletConnection } from './useWalletConnection'

// Re-export types for convenience
export type {
  PoolInfo,
  PoolMember,
  PoolDetails,
  LotteryRound,
  BadgeMetadata,
  YieldInfo,
  CreatePoolParams,
  JoinPoolParams,
  UsePoolFactoryReturn,
  UsePoolReturn,
  UseBadgeReturn,
  UseLotteryReturn,
  UseYieldManagerReturn,
} from '@/contracts/types'

// Export new dashboard and yield tracking types
export type {
  UserDashboardStats,
  ActivePool,
  UseDashboardReturn,
} from './useDashboard'

export type {
  YieldEntry,
  YieldChartData,
  YieldStats,
  UseYieldTrackingReturn,
} from './useYieldTracking'
