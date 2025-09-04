import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAccount, useReadContract, useReadContracts, useChainId } from 'wagmi'
import { Address, formatEther } from 'viem'
import { POOL_FACTORY_ABI, POOL_ABI, LOTTERY_MANAGER_ABI, BADGE_ABI, getContractAddress } from '@/contracts/config'
import { PoolInfo, LotteryRound, BadgeMetadata } from '@/contracts/types'

export interface UserDashboardStats {
  totalContributions: bigint
  totalYieldEarned: bigint
  totalBonusPrizes: bigint
  totalBadges: number
  activePoolsCount: number
  completedPoolsCount: number
  userPools: PoolInfo[]
  userBadges: BadgeMetadata[]
  lotteryWins: LotteryRound[]
}

export interface ActivePool {
  address: Address
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  currentMembers: bigint
  state: number // PoolStatus as number: 0=Open, 1=Locked, 2=Active, 3=Completed
  progress: number
  timeRemaining?: bigint
  yieldEarned: bigint
}

export interface UseDashboardReturn {
  // User data
  userAddress: Address | undefined
  isConnected: boolean
  
  // Pool data
  activePools: ActivePool[]
  completedPools: ActivePool[]
  allPools: ActivePool[]
  
  // Dashboard statistics
  stats: UserDashboardStats
  
  // Badges
  userBadges: BadgeMetadata[]
  
  // Lottery wins
  lotteryWins: LotteryRound[]
  
  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  
  // Actions
  refresh: () => Promise<void>
}

export const useDashboard = (): UseDashboardReturn => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Contract addresses
  const poolFactoryAddress = getContractAddress(chainId as number, 'poolFactory')
  const lotteryManagerAddress = getContractAddress(chainId as number, 'lotteryManager')
  const badgeAddress = getContractAddress(chainId as number, 'badge')
  
  console.log('Contract addresses:', {
    chainId,
    poolFactoryAddress,
    lotteryManagerAddress,
    badgeAddress,
    userAddress: address
  })
  
  // Get user pools from PoolFactory
  const { data: userPoolAddresses, isLoading: isPoolAddressesLoading, error: poolAddressesError } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getCreatorPools',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!poolFactoryAddress,
    },
  })

  console.log('UserPoolAddresses:', userPoolAddresses)
  console.log('PoolAddressesError:', poolAddressesError)


  // Get pool details for each user pool
  const poolContracts = useMemo(() => {
    if (!userPoolAddresses || !Array.isArray(userPoolAddresses)) return []
    return userPoolAddresses.flatMap((poolAddress: Address) => [
      {
        address: poolAddress,
        abi: POOL_ABI as any,
        functionName: 'getPoolInfo',
      },
      {
        address: poolAddress,
        abi: POOL_ABI as any,
        functionName: 'getMemberInfo',
        args: address ? [address] : undefined,
      },
      {
        address: poolAddress,
        abi: POOL_ABI as any,
        functionName: 'getTotalValue',
      },
    ])
  }, [userPoolAddresses, address])
  const { data: poolsData, isLoading: isPoolsLoading, error: poolsError } = useReadContracts({
    contracts: poolContracts,
    query: {
      enabled: poolContracts.length > 0,
    },
  })
  console.log('PoolsData:', poolsData)
  console.log('PoolsError:', poolsError)  
  // Get user badges directly
  const { data: userBadgesData, isLoading: isBadgesLoading } = useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'getUserBadges',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!badgeAddress,
    },
  })
  
  // Get lottery history
  const { data: lotteryHistory } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getDetailedParticipantHistory',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!lotteryManagerAddress,
    },
  })
  
  // Process and calculate statistics
  const { activePools, completedPools, stats } = useMemo(() => {
    if (!poolsData || !userPoolAddresses || !Array.isArray(userPoolAddresses)) {
      return {
        activePools: [] as ActivePool[],
        completedPools: [] as ActivePool[],
        stats: {
          totalContributions: 0n,
          totalYieldEarned: 0n,
          totalBonusPrizes: 0n,
          totalBadges: 0,
          activePoolsCount: 0,
          completedPoolsCount: 0,
          userPools: [],
          userBadges: [],
          lotteryWins: [],
        } as UserDashboardStats,
      }
    }
    
    const pools: ActivePool[] = []
    let totalContributions = 0n
    let totalYieldEarned = 0n
    let totalBonusPrizes = 0n
    
    console.log(poolsData)
    // Process pool data (3 contracts per pool: poolInfo, memberInfo, totalValue)
    for (let i = 0; i < (userPoolAddresses as Address[]).length; i++) {
      const baseIndex = i * 3
      const poolInfo = poolsData[baseIndex]?.result as any
      const memberInfo = poolsData[baseIndex + 1]?.result as any
      const totalValue = poolsData[baseIndex + 2]?.result as bigint | undefined

      if (poolInfo && poolInfo.status !== undefined) {
        const pool: ActivePool = {
          address: (userPoolAddresses as Address[])[i],
          name: poolInfo.name || `Pool ${i + 1}`,
          contributionAmount: poolInfo.contributionAmount,
          maxMembers: poolInfo.maxMembers,
          currentMembers: poolInfo.currentMembers,
          state: poolInfo.status, // This is the PoolStatus from the contract
          progress: Number(poolInfo.currentMembers) / Number(poolInfo.maxMembers) * 100,
          timeRemaining: poolInfo.duration,
          yieldEarned: totalValue ? totalValue - poolInfo.totalFunds : 0n,
        }
        
        pools.push(pool)
        
        // Add to totals if user is a member and has contributed
        if (memberInfo && memberInfo.memberAddress === address) {
          totalContributions += memberInfo.contribution || poolInfo.contributionAmount
          const yieldEarned = totalValue ? totalValue - poolInfo.totalFunds : 0n
          totalYieldEarned += yieldEarned
        }
      }
    }
    
    // Calculate lottery prizes
    if (lotteryHistory && Array.isArray(lotteryHistory)) {
      totalBonusPrizes = lotteryHistory.reduce((sum: bigint, round: any) => {
        return sum + (round.prizeAmount || 0n)
      }, 0n)
    }
    
    const activePools = pools.filter(pool => 
      pool.state === 0 ||  // PoolStatus.Open
      pool.state === 2     // PoolStatus.Active
    )
    
    const completedPools = pools.filter(pool => 
      pool.state === 3     // PoolStatus.Completed
    )
    
    const processedBadges: BadgeMetadata[] = userBadgesData && Array.isArray(userBadgesData) ? 
      userBadgesData.map((badge: any) => ({
        tokenId: badge.tokenId,
        badgeType: badge.badgeType,
        poolAddress: badge.poolAddress || '0x0',
        recipient: badge.recipient,
        timestamp: badge.timestamp,
      })) : []
    
    const lotteryWins: LotteryRound[] = lotteryHistory ? 
      (Array.isArray(lotteryHistory) ? lotteryHistory : []).filter((round: any) => round.prizeAmount > 0n) : []
    
    return {
      activePools,
      completedPools,
      stats: {
        totalContributions,
        totalYieldEarned,
        totalBonusPrizes,
        totalBadges: processedBadges.length,
        activePoolsCount: activePools.length,
        completedPoolsCount: completedPools.length,
        userPools: pools.map(pool => pool as any),
        userBadges: processedBadges,
        lotteryWins,
      } as UserDashboardStats,
    }
  }, [poolsData, userPoolAddresses, lotteryHistory, userBadgesData])
  
  const allPools = useMemo(() => [...activePools, ...completedPools], [activePools, completedPools])
  
  // Refresh function
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      // Trigger refetch of all queries
      // The wagmi hooks will automatically refetch when this component re-renders
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard data')
    } finally {
      setIsRefreshing(false)
    }
  }, [])
  
  const isLoading = isPoolAddressesLoading || isPoolsLoading || isBadgesLoading
  console.log(allPools)
  return {
    userAddress: address,
    isConnected,
    activePools,
    completedPools,
    allPools,
    stats,
    userBadges: stats.userBadges,
    lotteryWins: stats.lotteryWins,
    isLoading,
    isRefreshing,
    error,
    refresh,
  }
}
