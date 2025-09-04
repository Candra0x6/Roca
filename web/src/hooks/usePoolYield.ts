import { useCallback } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Address, formatEther } from 'viem'
import { YIELD_MANAGER_ABI, getContractAddress } from '@/contracts/config'
import { toast } from 'sonner'

export interface UsePoolYieldReturn {
  // Yield data
  currentYield: bigint
  totalValue: bigint
  deposits: bigint
  
  // Loading states
  isLoading: boolean
  isUpdating: boolean
  
  // Errors
  error: Error | null
  
  // Actions
  updateYield: () => Promise<void>
  refetch: () => void
  
  // Utils
  formatYield: (amount: bigint) => string
  yieldPercentage: number
}

export function usePoolYield(poolId: bigint): UsePoolYieldReturn {
  const chainId = useChainId()
  const yieldManagerAddress = getContractAddress(chainId, 'yieldManager')
  
  // Write contract hook for updating yield
  const { writeContract, data: updateHash } = useWriteContract()
  
  // Wait for update transaction
  const { 
    isLoading: isUpdating, 
    isSuccess: updateSuccess,
  } = useWaitForTransactionReceipt({
    hash: updateHash,
  })

  // Read current yield
  const { 
    data: currentYield, 
    refetch: refetchYield, 
    isLoading: isYieldLoading,
    error: yieldError 
  } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getYield',
    args: [poolId],
    query: {
      enabled: !!poolId && poolId > 0n,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Read total value (principal + yield)
  const { 
    data: totalValue, 
    refetch: refetchTotalValue,
    isLoading: isTotalValueLoading 
  } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getTotalValue',
    args: [poolId],
    query: {
      enabled: !!poolId && poolId > 0n,
      refetchInterval: 10000,
    },
  })

  // Read deposits (principal amount)
  const { 
    data: deposits, 
    refetch: refetchDeposits,
    isLoading: isDepositsLoading 
  } = useReadContract({
    address: yieldManagerAddress,
    abi: YIELD_MANAGER_ABI,
    functionName: 'getDeposits',
    args: [poolId],
    query: {
      enabled: !!poolId && poolId > 0n,
      refetchInterval: 10000,
    },
  })

  // Update yield function
  const updateYield = useCallback(async () => {
    if (!poolId || poolId <= 0n) {
      toast.error('Invalid pool ID')
      return
    }

    try {
      await writeContract({
        address: yieldManagerAddress,
        abi: YIELD_MANAGER_ABI,
        functionName: 'updateYield',
        args: [poolId],
      })
      
      toast.success('Yield update initiated')
    } catch (error) {
      console.error('Failed to update yield:', error)
      toast.error('Failed to update yield')
      throw error
    }
  }, [poolId, writeContract, yieldManagerAddress])

  // Format yield amount
  const formatYield = useCallback((amount: bigint): string => {
    return formatEther(amount)
  }, [])

  // Calculate yield percentage
  const yieldPercentage = useCallback((): number => {
    if (!deposits || !currentYield) return 0
    
    const depositsValue = deposits
    const yieldValue = currentYield
    
    if (depositsValue === 0n) return 0
    
    const yieldAmount = Number(formatEther(yieldValue))
    const principalAmount = Number(formatEther(depositsValue))
    
    return (yieldAmount / principalAmount) * 100
  }, [currentYield, deposits])

  // Refetch all data
  const refetch = useCallback(() => {
    refetchYield()
    refetchTotalValue()
    refetchDeposits()
  }, [])

  // Auto-refetch when update is successful
  if (updateSuccess) {
    setTimeout(() => {
      refetch()
    }, 2000)
  }

  const isLoading = isYieldLoading || isTotalValueLoading || isDepositsLoading
  const error = yieldError as Error | null

  return {
    currentYield: (currentYield as bigint) || 0n,
    totalValue: (totalValue as bigint) || 0n,
    deposits: (deposits as bigint) || 0n,
    isLoading,
    isUpdating,
    error,
    updateYield,
    refetch,
    formatYield,
    yieldPercentage: yieldPercentage(),
  }
}
