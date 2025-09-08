import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContracts } from 'wagmi'
import { Address } from 'viem'
import { POOL_ABI } from '@/contracts/config'
import { PoolDetails, PoolState, UsePoolReturn, PoolInfo, PoolMember } from '@/contracts/types'

export function usePool(poolAddress: Address): UsePoolReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Write contract hook
  const { writeContract, data: hash } = useWriteContract()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // Handle transaction completion
  useEffect(() => {
    if (isSuccess && hash) {
      console.log("Transaction successful, refetching data...")
      // Refetch pool data after successful transaction
      Promise.all([
        refetchPoolInfo(),
        refetchMembers(),
        refetchUserMembership(),
      ]).then(() => {
        console.log("Pool data refetched successfully")
        setIsLoading(false)
      }).catch((err) => {
        console.error("Error refetching data:", err)
        setIsLoading(false)
      })
    } else if (isError && hash) {
      console.error("Transaction failed")
      setError(new Error("Transaction failed"))
      setIsLoading(false)
    }
  }, [isSuccess, isError, hash])

  // Read pool info
  const { data: poolInfo, refetch: refetchPoolInfo } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getPoolInfo',
  })

  // Read pool members addresses
  const { data: memberAddresses, refetch: refetchMembers } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getMembers',
    query: {
      enabled: !!poolAddress,
    },
  })

  // Read member info for each member address using batch contract reads
  const memberInfoContracts = useMemo(() => {
    if (!memberAddresses || !Array.isArray(memberAddresses)) return []
    
    return (memberAddresses as Address[]).map(memberAddress => ({
      address: poolAddress,
      abi: POOL_ABI as any,
      functionName: 'getMemberInfo' as const,
      args: [memberAddress] as const,
    }))
  }, [memberAddresses, poolAddress])

  const { data: memberInfoResults } = useReadContracts({
    contracts: memberInfoContracts as any,
    query: {
      enabled: memberInfoContracts.length > 0,
    },
  })

  // Combine member addresses with their info
  const membersWithInfo = useMemo(() => {
    if (!memberAddresses || !Array.isArray(memberAddresses)) return []
    
    // If we have member info results, use them
    if (memberInfoResults && Array.isArray(memberInfoResults)) {
      return (memberAddresses as Address[]).map((memberAddress, index) => {
        const memberInfo = memberInfoResults[index]
        
        if (memberInfo?.status === 'success' && memberInfo.result) {
          const result = memberInfo.result as any
          return {
            member: memberAddress,
            joinedAt: result.joinedAt || 0n,
            hasWithdrawn: result.hasWithdrawn || false,
            contributionAmount: result.contribution || 0n,
          }
        }
        
        // Fallback if member info fetch failed
        const info = poolInfo as any
        return {
          member: memberAddress,
          joinedAt: BigInt(Math.floor(Date.now() / 1000) - (index * 3600)), // Mock timestamp
          hasWithdrawn: false,
          contributionAmount: info?.contributionAmount || 0n,
        }
      })
    }
    
    // Fallback if no member info results yet
    const info = poolInfo as any
    return (memberAddresses as Address[]).map((memberAddress, index) => ({
      member: memberAddress,
      joinedAt: BigInt(Math.floor(Date.now() / 1000) - (index * 3600)), // Mock timestamp
      hasWithdrawn: false,
      contributionAmount: info?.contributionAmount || 0n,
    }))
  }, [memberAddresses, memberInfoResults, poolInfo])

  // Read user membership status
  const { data: userMembership, refetch: refetchUserMembership } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getMember',
    args: account ? [account] : undefined,
    query: {
      enabled: !!poolAddress && !!account,
    },
  })

  // Combine all pool data - FIXED: Use specific properties instead of entire objects
  const poolDetails: PoolDetails | null = useMemo(() => {
    if (!poolInfo || !membersWithInfo) return null

    const info = poolInfo as any
    console.log("PoolINfo", info)
    console.log("insinsisinfo", info)
    const isUserMember = account && membersWithInfo.some((member: any) => member.member === account)
    const userMember = userMembership as any
    console.log(membersWithInfo)
    
    return {
      name: info.name,
      contributionAmount: info.contributionAmount,
      maxMembers: info.maxMembers,
      duration: info.duration,
      creator: info.creator,
      createdAt: info.createdAt,
      state: info.status,
      currentMembers: info.currentMembers,
      totalContributions: info.totalFunds,
      yieldGenerated: info.yieldGenerated || 0n,
      endTime: info.endTime || (info.createdAt + info.duration),
      yieldManager: info.yieldManager,
      badgeContract: info.badgeContract || "0x0000000000000000000000000000000000000000",
      members: membersWithInfo,
      memberAddresses: membersWithInfo.map((member: any) => member.member),
      isUserMember: !!isUserMember,
      userMembership: userMember ? {
        member: userMember.member,
        joinedAt: userMember.joinedAt,
        hasWithdrawn: userMember.hasWithdrawn,
        contributionAmount: userMember.contributionAmount,
      } : undefined,
    }
  }, [poolInfo, membersWithInfo, userMembership, account])

  // Derived state for UI controls
  const canJoin = useMemo(() => {
    if (!poolDetails || !account) return false
    return (
      poolDetails.state === PoolState.Open &&
      !poolDetails.isUserMember &&
      poolDetails.currentMembers < poolDetails.maxMembers
    )
  }, [poolDetails, account])

  const canLeave = useMemo(() => {
    if (!poolDetails || !account) return false
    return (
      poolDetails.state === PoolState.Open &&
      poolDetails.isUserMember
    )
  }, [poolDetails, account])

  const canWithdraw = useMemo(() => {
    if (!poolDetails || !account || !poolDetails.userMembership) return false
    return (
      poolDetails.state === PoolState.Completed &&
      poolDetails.isUserMember &&
      !poolDetails.userMembership.hasWithdrawn
    )
  }, [poolDetails, account])

  // Rest of your functions remain the same...
  const joinPool = useCallback(async () => {
    if (!account || !poolDetails) {
      throw new Error('Wallet not connected or pool data not available')
    }

    try {
      setIsLoading(true)
      setError(null)

      await writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'joinPool',
        value: poolDetails.contributionAmount,
      })

      // Transaction handling is now done in useEffect when isSuccess changes

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join pool')
      setError(error)
      setIsLoading(false) // Reset loading state on error
      throw error
    }
  }, [account, poolDetails, poolAddress, writeContract])

  const leavePool = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'leavePool',
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch pool data
      await Promise.all([
        refetchPoolInfo(),
        refetchMembers(),
        refetchUserMembership(),
      ])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to leave pool')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, poolDetails, poolAddress, writeContract])

  const withdrawShare = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    if (!poolDetails) {
      throw new Error('Pool data not available')
    }

    if (poolDetails.state !== PoolState.Completed) {
      throw new Error('Pool must be completed before withdrawal')
    }

    if (!poolDetails.isUserMember) {
      throw new Error('You are not a member of this pool')
    }

    if (poolDetails.userMembership?.hasWithdrawn) {
      throw new Error('You have already withdrawn your share')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'withdrawShare',
      })

  
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to withdraw share')
      setError(error)
      throw error
    } 
  }, [account, poolDetails, poolAddress, writeContract])

  const completePool = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    if (!poolDetails) {
      throw new Error('Pool data not available')
    }

    if (poolDetails.state !== PoolState.Active) {
      throw new Error('Pool must be active to complete')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'completePool',
      })

  
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to complete pool')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, poolDetails, poolAddress, writeContract])

  const triggerCompletion = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    if (!poolDetails) {
      throw new Error('Pool data not available')
    }

    if (poolDetails.state !== PoolState.Active) {
      throw new Error('Pool must be active to trigger completion')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'triggerCompletion',
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch pool data
      await Promise.all([
        refetchPoolInfo(),
        refetchMembers(),
        refetchUserMembership(),
      ])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to trigger completion')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, poolDetails, poolAddress, writeContract])

  // Refetch function to manually refresh pool data
  const refetch = useCallback(async () => {
    try {
      await Promise.all([
        refetchPoolInfo(),
        refetchMembers(),
        refetchUserMembership(),
      ])
    } catch (error) {
      console.error('Failed to refetch pool data:', error)
    }
  }, [refetchPoolInfo, refetchMembers, refetchUserMembership])

  return {
    poolInfo: poolDetails,
    joinPool,
    leavePool,
    withdrawShare,
    completePool,
    triggerCompletion,
    refetch,
    isLoading: isLoading || isConfirming,
    error,
    canJoin,
    canLeave,
    canWithdraw,
  }
}

// Legacy hook for backward compatibility
export function useJoinPool(poolAddress: `0x${string}`) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const joinPool = useCallback(async (contributionAmount: bigint) => {
    setIsLoading(true)
    setError(null)
    
    try {
      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'joinPool',
        value: contributionAmount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join pool')
      setIsLoading(false)
    }
  }, [poolAddress, writeContract])

  return {
    joinPool,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook for leaving a pool
export function useLeavePool(poolAddress: Address) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const leavePool = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      writeContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'leavePool',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave pool')
      setIsLoading(false)
    }
  }, [poolAddress, writeContract])

  return {
    leavePool,
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook to get pool information
export function usePoolInfo(poolAddress: Address) {
  const { data: poolInfo, isLoading, error, refetch } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getPoolInfo',
   
  })

  return {
    poolInfo: poolInfo as PoolInfo | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Hook to get pool members
export function usePoolMembers(poolAddress: Address) {
  const { data: members, isLoading, error, refetch } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getMembers',
    
  })

  return {
    members: members as readonly Address[] | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Hook to check if user is a member of the pool
export function useIsMember(poolAddress: Address, userAddress: Address | undefined) {
  const { data: isMember, isLoading, error } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'isMember',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    isMember: isMember as boolean | undefined,
    isLoading,
    error,
  }
}

// Hook to get member information
export function useMemberInfo(poolAddress: Address, memberAddress: Address | undefined) {
  const { data: memberInfo, isLoading, error, refetch } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getMemberInfo',
    args: memberAddress ? [memberAddress] : undefined,
    query: {
      enabled: !!memberAddress,
    },
  })

  return {
    memberInfo: memberInfo as PoolMember | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Hook to get withdrawal information for a member
export function useWithdrawalInfo(poolAddress: Address, memberAddress: Address | undefined) {
  const { data: memberInfo } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getMemberInfo',
    args: memberAddress ? [memberAddress] : undefined,
    query: {
      enabled: !!memberAddress,
    },
  })

  const { data: poolInfo } = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'getPoolInfo',
  })

  const withdrawalDetails = useMemo(() => {
    if (!memberInfo || !poolInfo) return null

    const member = memberInfo as any
    const pool = poolInfo as any
    
    // From the test and contract, withdrawal includes principal + yield earned
    const principal = member.contribution || 0n
    const yieldShare = member.yieldEarned || 0n
    const totalAmount = principal + yieldShare
    
    return {
      principal,
      yieldShare,
      totalAmount,
      hasWithdrawn: member.hasWithdrawn || false,
      canWithdraw: pool.status === PoolState.Completed && !member.hasWithdrawn,
    }
  }, [memberInfo, poolInfo])

  return withdrawalDetails
}
