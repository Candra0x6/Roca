import { useReadContract, useChainId } from 'wagmi'
import { Address } from 'viem'
import { LOTTERY_MANAGER_ABI, getContractAddress } from '@/contracts/config'

/**
 * Simple hook to get lottery participants for a pool
 * This mirrors the successful test implementation
 */
export function useLotteryParticipants(poolId: bigint | undefined) {
  const chainId = useChainId()
  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  const { data: participants, isLoading, error, refetch } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getPoolParticipants',
    args: poolId ? [poolId] : undefined,
    query: {
      enabled: !!poolId && !!lotteryManagerAddress,
    },
  })

  // Extract participant addresses from the returned structs
  const participantAddresses = participants && Array.isArray(participants) 
    ? participants.map((participant: any) => participant.participantAddress || participant[0])
    : []

  return {
    participants: participantAddresses as Address[],
    participantCount: participantAddresses.length,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Simple hook to check if a pool is eligible for lottery
 */
export function usePoolLotteryEligibility(poolId: bigint | undefined) {
  const chainId = useChainId()
  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  const { data: isEligible, isLoading, error, refetch } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'isPoolEligible',
    args: poolId ? [poolId] : undefined,
    query: {
      enabled: !!poolId && !!lotteryManagerAddress,
    },
  })

  return {
    isEligible: Boolean(isEligible),
    isLoading,
    error,
    refetch,
  }
}
