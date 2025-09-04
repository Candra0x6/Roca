import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Address } from 'viem'
import { YIELD_MANAGER_ABI, getContractAddress } from '@/contracts/config'
import { YieldInfo, UseYieldManagerReturn } from '@/contracts/types'

export function useYieldManager(poolAddress?: Address): UseYieldManagerReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')

  // Write contract hook
  const { writeContract, data: hash } = useWriteContract()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })  

  // Read yield info for pool
  const { data: yieldData, refetch: refetchYieldInfo } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getYieldInfo',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!yieldManagerAddress && !!poolAddress,
    },
  })

  // Update yield function
  const updateYield = useCallback(async (targetPoolAddress: Address) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: yieldManagerAddress,
        abi: YIELD_MANAGER_ABI,
        functionName: 'updateYield',
        args: [targetPoolAddress],
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch yield data
      await refetchYieldInfo()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update yield')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, yieldManagerAddress, writeContract, isSuccess, isError, refetchYieldInfo])

  // Stake funds function
  const stakeFunds = useCallback(async (targetPoolAddress: Address, amount: bigint) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: yieldManagerAddress,
        abi: YIELD_MANAGER_ABI,
        functionName: 'stakeFunds',
        args: [targetPoolAddress, amount],
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch yield data
      await refetchYieldInfo()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stake funds')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, yieldManagerAddress, writeContract, isSuccess, isError, refetchYieldInfo])

  // Unstake funds function
  const unstakeFunds = useCallback(async (targetPoolAddress: Address) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: yieldManagerAddress,
        abi: YIELD_MANAGER_ABI,
        functionName: 'unstakeFunds',
        args: [targetPoolAddress],
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch yield data
      await refetchYieldInfo()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unstake funds')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, yieldManagerAddress, writeContract, isSuccess, isError, refetchYieldInfo])

  // Transform yield data
  const yieldInfo: YieldInfo | null = yieldData ? {
    pool: (yieldData as any).pool,
    principal: (yieldData as any).principal,
    yieldGenerated: (yieldData as any).yieldGenerated,
    lastUpdateTime: (yieldData as any).lastUpdateTime,
    isActive: (yieldData as any).isActive,
  } : null

  return {
    yieldInfo,
    updateYield,
    stakeFunds,
    unstakeFunds,
    isLoading: isLoading || isConfirming,
    error,
  }
}

// Hook to get yield APY
export function useYieldAPY() {
  const chainId = useChainId()
  const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')

  const { data: apy, isLoading, error } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getAPY',
    query: {
      enabled: !!yieldManagerAddress,
    },
  })

  return {
    apy: apy as bigint | undefined,
    isLoading,
    error,
  }
}

// Hook to get total yield generated across all pools
export function useTotalYield() {
  const chainId = useChainId()
  const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')

  const { data: totalYield, isLoading, error } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getTotalYield',
    query: {
      enabled: !!yieldManagerAddress,
    },
  })

  return {
    totalYield: totalYield as bigint | undefined,
    isLoading,
    error,
  }
}

// Hook to check if pool is staked
export function useIsPoolStaked(poolAddress: Address) {
  const chainId = useChainId()
  const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')

  const { data: isStaked, isLoading, error } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'isPoolStaked',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!yieldManagerAddress && !!poolAddress,
    },
  })

  return {
    isStaked: isStaked as boolean | undefined,
    isLoading,
    error,
  }
}
