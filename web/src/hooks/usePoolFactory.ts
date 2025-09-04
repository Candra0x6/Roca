import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Address, parseEther } from 'viem'
import { POOL_FACTORY_ABI, getContractAddress } from '@/contracts/config'
import { CreatePoolParams as TypedCreatePoolParams, UsePoolFactoryReturn } from '@/contracts/types'

export function usePoolFactory(): UsePoolFactoryReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')

  // Read all pools
  const { data: pools = [], refetch: refetchPools } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getAllPools',
    query: {
      enabled: !!poolFactoryAddress,
    },
  })

  // Write contract hook
  const { writeContract, data: hash } = useWriteContract()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // Create pool function
  const createPool = useCallback(async (params: TypedCreatePoolParams): Promise<Address> => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')
      const badgeAddress = getContractAddress(chainId, 'badge')

      writeContract({
        address: poolFactoryAddress,
        abi: POOL_FACTORY_ABI,
        functionName: 'createPool',
        args: [{
          name: params.name,
          contributionAmount: params.contributionAmount,
          maxMembers: params.maxMembers,
          duration: params.duration,
          yieldManager: yieldManagerAddress,
        }],
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch pools to get the latest data
      const updatedPools = await refetchPools()
      
      // Get the latest pool address (assuming it's the last one created)
      const poolsArray = updatedPools.data as Address[]
      const newPoolAddress = poolsArray[poolsArray.length - 1]

      return newPoolAddress
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create pool')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, chainId, poolFactoryAddress, writeContract, isSuccess, isError, refetchPools])

  // Get user pools
  const getUserPools = useCallback(async (userAddress: Address): Promise<Address[]> => {
    // This should be implemented using a separate hook or moved to component level
    // For now, return empty array to avoid hook rule violations
    return []
  }, [])

  // Get pool by ID
  const getPoolById = useCallback(async (poolId: bigint): Promise<Address | null> => {
    // This should be implemented using a separate hook or moved to component level
    // For now, return null to avoid hook rule violations
    return null
  }, [])

  return {
    pools: pools as Address[],
    createPool,
    getUserPools,
    getPoolById,
    isLoading: isLoading || isConfirming,
    error,
  }
}

// Legacy hooks for backward compatibility
export interface CreatePoolParams {
  name: string
  contributionAmount: string // ETH amount as string
  maxMembers: number
  duration: number // duration in seconds
}

export function useCreatePool() {
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createPool = useCallback(async (params: CreatePoolParams) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')
      const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')
      const badgeAddress = getContractAddress(chainId, 'badge')
      
      writeContract({
        address: poolFactoryAddress,
        abi: POOL_FACTORY_ABI,
        functionName: 'createPool',
        args: [{
          name: params.name,
          contributionAmount: parseEther(params.contributionAmount),
          maxMembers: params.maxMembers,
          duration: params.duration,
          yieldManager: yieldManagerAddress,
        }],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pool')
      setIsLoading(false)
    }
  }, [chainId, writeContract])

  return {
    createPool,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook to get pool statistics
export function usePoolStatistics() {
  const chainId = useChainId()
  
  const { data: stats, isLoading, error } = useReadContract({
    address: getContractAddress(chainId, 'poolFactory'),
    abi: POOL_FACTORY_ABI,
    functionName: 'getPoolStatistics',
  })

  return {
    statistics: stats as { totalPools: bigint; activePools: bigint; completedPools: bigint } | undefined,
    isLoading,
    error,
  }
}

// Hook to get user's pools
export function useUserPools(userAddress: `0x${string}` | undefined) {
  const chainId = useChainId()
  
  const { data: poolIds, isLoading, error } = useReadContract({
    address: getContractAddress(chainId, 'poolFactory'),
    abi: POOL_FACTORY_ABI,
    functionName: 'getCreatorPools',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    poolIds: poolIds as readonly bigint[] | undefined,
    isLoading,
    error,
  }
}
