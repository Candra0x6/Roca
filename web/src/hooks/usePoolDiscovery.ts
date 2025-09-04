import { useMemo, useEffect, useState } from 'react'
import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { Address } from 'viem'
import { POOL_FACTORY_ABI, POOL_ABI, getContractAddress } from '@/contracts/config'
import { PoolInfo, PoolState } from '@/contracts/types'

export interface PoolListItem {
  address: Address
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  currentMembers: bigint
  duration: bigint
  creator: Address
  state: PoolState
  createdAt: bigint
  endTime?: bigint
  yieldGenerated: bigint
  totalContributions: bigint
}

export interface UsePoolDiscoveryReturn {
  pools: PoolListItem[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function usePoolDiscovery(): UsePoolDiscoveryReturn {
  const chainId = useChainId()
  const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')

  // Get all pool addresses
  const { 
    data: poolAddresses = [], 
    isLoading: isLoadingAddresses, 
    error: addressError,
    refetch: refetchAddresses 
  } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getAllPools',
    query: {
      enabled: !!poolFactoryAddress,
    },
  })

  // Get pool statistics for total counts
  const { data: poolStats } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getPoolStatistics',
    query: {
      enabled: !!poolFactoryAddress,
    },
  })

  // Prepare contract calls for batch reading pool info
  const poolInfoContracts = useMemo(() => {
    if (!poolAddresses || (poolAddresses as Address[]).length === 0) {
      return []
    }
    
    return (poolAddresses as Address[]).map((address) => ({
      address: address,
      abi: POOL_ABI,
      functionName: 'getPoolInfo',
    }) as const)
  }, [poolAddresses])

  // Batch read all pool info using useReadContracts
  const { 
    data: poolInfoResults = [], 
    isLoading: isLoadingPoolInfo, 
    error: poolInfoError,
    refetch: refetchPoolInfo
  } = useReadContracts({
    contracts: poolInfoContracts as any,
    query: {
      enabled: poolInfoContracts.length > 0,
    },
  })

  // Transform the contract results into PoolListItem format
  const pools = useMemo(() => {
    if (!poolAddresses || !poolInfoResults || (poolAddresses as Address[]).length === 0) {
      return []
    }

    const poolsWithDetails: PoolListItem[] = []

    for (let i = 0; i < (poolAddresses as Address[]).length; i++) {
      const address = (poolAddresses as Address[])[i]
      const result = poolInfoResults[i]

      if (result?.status === 'success' && result?.result) {
        // result.result contains the PoolInfo struct from the contract
        const poolInfo = result.result as any
        
        const poolDetails: PoolListItem = {
          address,
          name: poolInfo.name || `Pool ${i + 1}`,
          contributionAmount: BigInt(poolInfo.contributionAmount || 0),
          maxMembers: BigInt(poolInfo.maxMembers || 0),
          currentMembers: BigInt(poolInfo.currentMembers || 0),
          duration: BigInt(poolInfo.duration || 0),
          creator: poolInfo.creator || address,
          state: poolInfo.status !== undefined ? poolInfo.status : PoolState.Open,
          createdAt: BigInt(poolInfo.createdAt || 0),
          endTime: poolInfo.lockedAt && poolInfo.duration ? 
            BigInt(poolInfo.lockedAt) + BigInt(poolInfo.duration) : undefined,
          yieldGenerated: BigInt(0), // This might need additional contract call or calculation
          totalContributions: BigInt(poolInfo.totalFunds || 0),
        }
        
        poolsWithDetails.push(poolDetails)
      } else {
        // Handle failed contract calls - could be due to network issues or contract errors
        console.warn(`Failed to fetch pool info for ${address}:`, result?.error || 'Unknown error')
        
        // Add a basic entry with minimal data as fallback
        const fallbackDetails: PoolListItem = {
          address,
          name: `Pool ${i + 1}`,
          contributionAmount: BigInt(0),
          maxMembers: BigInt(0),
          currentMembers: BigInt(0),
          duration: BigInt(0),
          creator: address,
          state: PoolState.Open,
          createdAt: BigInt(0),
          yieldGenerated: BigInt(0),
          totalContributions: BigInt(0),
        }
        
        poolsWithDetails.push(fallbackDetails)
      }
    }

    return poolsWithDetails
  }, [poolAddresses, poolInfoResults])

  const refetch = () => {
    refetchAddresses()
    refetchPoolInfo?.()
  }

  return {
    pools,
    isLoading: isLoadingAddresses || isLoadingPoolInfo,
    error: addressError || poolInfoError,
    refetch,
  }
}

// Hook for filtering and searching pools
export function usePoolFilters(pools: PoolListItem[]) {
  const filterPools = useMemo(() => {
    return {
      byState: (state: PoolState) => pools.filter(pool => pool.state === state),
      byContributionRange: (min: bigint, max: bigint) => 
        pools.filter(pool => pool.contributionAmount >= min && pool.contributionAmount <= max),
      byAvailableSlots: () => pools.filter(pool => pool.currentMembers < pool.maxMembers && pool.state === PoolState.Open),
      search: (query: string) => pools.filter(pool => 
        pool.name.toLowerCase().includes(query.toLowerCase()) ||
        pool.address.toLowerCase().includes(query.toLowerCase())
      ),
      all: () => pools,
    }
  }, [pools])

  return filterPools
}
