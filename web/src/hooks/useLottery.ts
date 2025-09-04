import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Address } from 'viem'
import { LOTTERY_MANAGER_ABI, getContractAddress } from '@/contracts/config'
import { LotteryRound, UseLotteryReturn } from '@/contracts/types'

export function useLottery(poolAddress?: Address): UseLotteryReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  // Write contract hook
  const { writeContract, data: hash } = useWriteContract()

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // Read current lottery round for pool
  const { data: currentRound, refetch: refetchCurrentRound } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getCurrentRound',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!lotteryManagerAddress && !!poolAddress,
    },
  })

  // Read lottery history for pool
  const { data: pastRounds, refetch: refetchPastRounds } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getLotteryHistory',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!lotteryManagerAddress && !!poolAddress,
    },
  })

  // Draw lottery function
  const drawLottery = useCallback(async (targetPoolAddress: Address) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'drawLottery',
        args: [targetPoolAddress],
      })

      // Wait for transaction to be mined
      while (!isSuccess && !isError) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (isError) {
        throw new Error('Transaction failed')
      }

      // Refetch lottery data
      await Promise.all([
        refetchCurrentRound(),
        refetchPastRounds(),
      ])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to draw lottery')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [account, lotteryManagerAddress, writeContract, isSuccess, isError, refetchCurrentRound, refetchPastRounds])

  // Get lottery history function
  const getLotteryHistory = useCallback(async (targetPoolAddress: Address): Promise<LotteryRound[]> => {
    if (!lotteryManagerAddress) return []

    try {
      const history = await useReadContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'getLotteryHistory',
        args: [targetPoolAddress],
      })

      const rounds = history.data as any[]
      return rounds.map((round: any) => ({
        pool: round.pool,
        round: round.round,
        winner: round.winner,
        prizeAmount: round.prizeAmount,
        timestamp: round.timestamp,
        participants: round.participants,
      }))
    } catch (err) {
      console.error('Failed to get lottery history:', err)
      return []
    }
  }, [lotteryManagerAddress])

  // Transform current round data
  const currentLotteryRound: LotteryRound | null = currentRound ? {
    pool: (currentRound as any).pool,
    round: (currentRound as any).round,
    winner: (currentRound as any).winner,
    prizeAmount: (currentRound as any).prizeAmount,
    timestamp: (currentRound as any).timestamp,
    participants: (currentRound as any).participants,
  } : null

  // Transform past rounds data
  const pastLotteryRounds: LotteryRound[] = (pastRounds as any[] || []).map((round: any) => ({
    pool: round.pool,
    round: round.round,
    winner: round.winner,
    prizeAmount: round.prizeAmount,
    timestamp: round.timestamp,
    participants: round.participants,
  }))

  return {
    currentRound: currentLotteryRound,
    pastRounds: pastLotteryRounds,
    drawLottery,
    getLotteryHistory,
    isLoading: isLoading || isConfirming,
    error,
  }
}

// Hook to check if user can draw lottery
export function useCanDrawLottery(poolAddress: Address) {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  const { data: canDraw, isLoading, error } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'canDrawLottery',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!lotteryManagerAddress && !!poolAddress,
    },
  })

  return {
    canDraw: canDraw as boolean | undefined,
    isLoading,
    error,
  }
}

// Hook to get lottery statistics
export function useLotteryStatistics(poolAddress: Address) {
  const chainId = useChainId()
  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  const { data: stats, isLoading, error } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getLotteryStats',
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!lotteryManagerAddress && !!poolAddress,
    },
  })

  return {
    statistics: stats as { 
      totalRounds: bigint
      totalPrizeDistributed: bigint
      averagePrize: bigint
      lastDrawTime: bigint
    } | undefined,
    isLoading,
    error,
  }
}
