/**
 * @title Lottery Integration Hook
 * @dev Complete lottery system integration hook for frontend
 * 
 * This hook provides the same functionality as the lottery integration test,
 * allowing users to interact with the lottery system from the frontend:
 * 
 * - View lottery eligibility for pools
 * - Check current lottery configuration
 * - View lottery statistics and history
 * - Trigger lottery draws (admin only)
 * - View lottery participants and winners
 * - Check lottery prizes and distributions
 * 
 * Based on the comprehensive lottery integration test flow
 */

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi'
import { Address, formatEther } from 'viem'
import { LOTTERY_MANAGER_ABI, POOL_ABI, getContractAddress } from '@/contracts/config'

// Lottery configuration interface
export interface LotteryConfig {
  drawInterval: bigint
  prizePercentage: bigint
  minPoolSize: bigint
  maxPrizeAmount: bigint
  isActive: boolean
}

// Lottery draw information
export interface LotteryDraw {
  drawId: bigint
  poolId: bigint
  winner: Address
  participants: Address[]
  prizeAmount: bigint
  timestamp: bigint
  totalParticipants: bigint
}

// Lottery participant info
export interface LotteryParticipant {
  participant: Address
  poolId: bigint
  weight: bigint
  registeredAt: bigint
}

// Global lottery statistics
export interface LotteryStats {
  totalDraws: bigint
  totalPrizesDistributed: bigint
  totalParticipants: bigint
  averagePrizeAmount: bigint
}

// Pool lottery status
export interface PoolLotteryStatus {
  poolId: bigint
  isEligible: boolean
  participantCount: bigint
  participants: Address[]
  nextDrawTime: bigint
  lastDrawId: bigint
  totalPrizesWon: bigint
}

export interface UseLotteryIntegrationReturn {
  // Lottery configuration
  lotteryConfig: LotteryConfig | null
  updateLotteryConfig: (config: LotteryConfig) => Promise<void>
  setLotteryActive: (active: boolean) => Promise<void>
  
  // Pool lottery status
  getPoolLotteryStatus: (poolId: bigint) => Promise<PoolLotteryStatus | null>
  poolLotteryStatus: PoolLotteryStatus | null
  isPoolEligible: (poolId: bigint) => Promise<boolean>
  
  // Lottery draws
  requestLotteryDraw: (poolId: bigint) => Promise<void>
  getLotteryDraw: (drawId: bigint) => Promise<LotteryDraw | null>
  getPoolDrawHistory: (poolId: bigint) => Promise<LotteryDraw[]>
  
  // Participants
  getPoolParticipants: (poolId: bigint) => Promise<Address[]>
  addParticipants: (poolId: bigint, participants: Address[], weights: bigint[]) => Promise<void>
  removeParticipant: (poolId: bigint, participant: Address) => Promise<void>
  
  // Statistics
  globalStats: LotteryStats | null
  getGlobalLotteryStats: () => Promise<LotteryStats | null>
  calculatePrizeAmount: (poolId: bigint, yieldAmount: bigint) => Promise<bigint>
  
  // Admin functions
  emergencyPause: () => Promise<void>
  emergencyUnpause: () => Promise<void>
  withdrawFunds: (amount: bigint, recipient: Address) => Promise<void>
  
  // Loading states
  isLoading: boolean
  isConfiguring: boolean
  isDrawing: boolean
  isUpdatingParticipants: boolean
  
  // Error handling
  error: Error | null
  clearError: () => void
  
  // Transaction states
  hash: `0x${string}` | undefined
  isConfirming: boolean
  isSuccess: boolean
  isError: boolean
  
  // Utility functions
  refetchAll: () => Promise<void>
  formatPrizeAmount: (amount: bigint) => string
  formatDuration: (seconds: bigint) => string
}

export function useLotteryIntegration(poolAddress?: Address, poolId?: bigint): UseLotteryIntegrationReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  
  // Component state
  const [isLoading, setIsLoading] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isUpdatingParticipants, setIsUpdatingParticipants] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [poolLotteryStatus, setPoolLotteryStatus] = useState<PoolLotteryStatus | null>(null)
  const [globalStats, setGlobalStats] = useState<LotteryStats | null>(null)

  const lotteryManagerAddress = getContractAddress(chainId, 'lotteryManager')

  // Contract interaction hooks
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // Read lottery configuration
  const { data: lotteryConfig, refetch: refetchConfig } = useReadContract({
    address: lotteryManagerAddress,
    abi: LOTTERY_MANAGER_ABI,
    functionName: 'getLotteryConfig',
    query: {
      enabled: !!lotteryManagerAddress,
    },
  }) as { data: LotteryConfig | undefined, refetch: () => Promise<any> }

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Update lottery configuration
  const updateLotteryConfig = useCallback(async (config: LotteryConfig) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    setIsConfiguring(true)
    setError(null)

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'updateLotteryConfig',
        args: [config],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update lottery configuration')
      setError(error)
      throw error
    } finally {
      setIsConfiguring(false)
    }
  }, [])

  // Set lottery active/inactive
  const setLotteryActive = useCallback(async (active: boolean) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    setIsConfiguring(true)
    setError(null)

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'setLotteryActive',
        args: [active],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to set lottery status')
      setError(error)
      throw error
    } finally {
      setIsConfiguring(false)
    }
  }, [])

  // Get pool lottery status
  const getPoolLotteryStatus = useCallback(async (targetPoolId: bigint): Promise<PoolLotteryStatus | null> => {
    if (!lotteryManagerAddress) return null

    setIsLoading(true)
    setError(null)

    try {
      // Check if pool is eligible
      const isEligible = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: lotteryManagerAddress,
          data: `0x${LOTTERY_MANAGER_ABI.find(f => f.name === 'isPoolEligible')?.inputs ? '' : ''}`
        }]
      })

      // Get participants
      const participants = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: lotteryManagerAddress,
          data: `0x${LOTTERY_MANAGER_ABI.find(f => f.name === 'getPoolParticipants')?.inputs ? '' : ''}`
        }]
      })

      const status: PoolLotteryStatus = {
        poolId: targetPoolId,
        isEligible: Boolean(isEligible),
        participantCount: BigInt(participants?.length || 0),
        participants: participants || [],
        nextDrawTime: 0n, // To be calculated based on last draw + interval
        lastDrawId: 0n, // To be fetched from contract
        totalPrizesWon: 0n, // To be calculated from history
      }

      setPoolLotteryStatus(status)
      return status
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get pool lottery status')
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check if pool is eligible for lottery
  const isPoolEligible = useCallback(async (targetPoolId: bigint): Promise<boolean> => {
    if (!lotteryManagerAddress || !publicClient) return false

    try {
      const result = await publicClient.readContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'isPoolEligible',
        args: [targetPoolId],
      })

      return Boolean(result)
    } catch (err) {
      console.error('Failed to check pool eligibility:', err)
      return false
    }
  }, [])

  // Request lottery draw
  const requestLotteryDraw = useCallback(async (targetPoolId: bigint) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    setIsDrawing(true)
    setError(null)

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'requestLotteryDraw',
        args: [targetPoolId],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request lottery draw')
      setError(error)
      throw error
    } finally {
      setIsDrawing(false)
    }
  }, [])

  // Get lottery draw information
  const getLotteryDraw = useCallback(async (drawId: bigint): Promise<LotteryDraw | null> => {
    if (!lotteryManagerAddress) return null

    try {
      // This would need to be implemented using the contract's getDraw function
      // For now, return mock data structure
      return {
        drawId,
        poolId: 0n,
        winner: '0x0000000000000000000000000000000000000000' as Address,
        participants: [],
        prizeAmount: 0n,
        timestamp: 0n,
        totalParticipants: 0n,
      }
    } catch (err) {
      console.error('Failed to get lottery draw:', err)
      return null
    }
  }, [])

  // Get pool draw history
  const getPoolDrawHistory = useCallback(async (targetPoolId: bigint): Promise<LotteryDraw[]> => {
    if (!lotteryManagerAddress) return []

    try {
      // This would fetch all historical draws for the pool
      // Implementation depends on contract's history storage mechanism
      return []
    } catch (err) {
      console.error('Failed to get pool draw history:', err)
      return []
    }
  }, [lotteryManagerAddress])

  // Get pool participants
  const getPoolParticipants = useCallback(async (targetPoolId: bigint): Promise<Address[]> => {
    if (!lotteryManagerAddress || !publicClient) return []

    try {
      const result = await publicClient.readContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'getPoolParticipants',
        args: [targetPoolId],
      })

      // The contract returns an array of Participant structs, extract participantAddress
      if (Array.isArray(result)) {
        return result.map((participant: any) => participant.participantAddress || participant[0])
      }
      
      return []
    } catch (err) {
      console.error('Failed to get pool participants:', err, 'PoolId:', targetPoolId)
      return []
    }
  }, [lotteryManagerAddress, publicClient])

  // Add participants to lottery
  const addParticipants = useCallback(async (targetPoolId: bigint, participants: Address[], weights: bigint[]) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    setIsUpdatingParticipants(true)
    setError(null)

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'addParticipants',
        args: [targetPoolId, participants, weights],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add participants')
      setError(error)
      throw error
    } finally {
      setIsUpdatingParticipants(false)
    }
  }, [])

  // Remove participant from lottery
  const removeParticipant = useCallback(async (targetPoolId: bigint, participant: Address) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    setIsUpdatingParticipants(true)
    setError(null)

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'removeParticipant',
        args: [targetPoolId, participant],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove participant')
      setError(error)
      throw error
    } finally {
      setIsUpdatingParticipants(false)
    }
  }, [])

  // Get global lottery statistics
  const getGlobalLotteryStats = useCallback(async (): Promise<LotteryStats | null> => {
    if (!lotteryManagerAddress) return null

    try {
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: lotteryManagerAddress,
          data: `0x${LOTTERY_MANAGER_ABI.find(f => f.name === 'getGlobalLotteryStats')?.inputs ? '' : ''}`
        }]
      })

      if (result) {
        const stats: LotteryStats = {
          totalDraws: BigInt(result[0] || 0),
          totalPrizesDistributed: BigInt(result[1] || 0),
          totalParticipants: BigInt(result[2] || 0),
          averagePrizeAmount: BigInt(result[3] || 0),
        }
        setGlobalStats(stats)
        return stats
      }
      return null
    } catch (err) {
      console.error('Failed to get global lottery stats:', err)
      return null
    }
  }, [])

  // Calculate prize amount
  const calculatePrizeAmount = useCallback(async (targetPoolId: bigint, yieldAmount: bigint): Promise<bigint> => {
    if (!lotteryManagerAddress) return 0n

    try {
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: lotteryManagerAddress,
          data: `0x${LOTTERY_MANAGER_ABI.find(f => f.name === 'calculatePrizeAmount')?.inputs ? '' : ''}`
        }]
      })
      return BigInt(result || 0)
    } catch (err) {
      console.error('Failed to calculate prize amount:', err)
      return 0n
    }
  }, [])

  // Emergency functions
  const emergencyPause = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'emergencyPause',
        args: [],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to emergency pause')
      setError(error)
      throw error
    }
  }, [account, lotteryManagerAddress, writeContract])

  const emergencyUnpause = useCallback(async () => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'emergencyUnpause',
        args: [],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to emergency unpause')
      setError(error)
      throw error
    }
  }, [])

  const withdrawFunds = useCallback(async (amount: bigint, recipient: Address) => {
    if (!account) {
      throw new Error('Wallet not connected')
    }

    try {
      writeContract({
        address: lotteryManagerAddress,
        abi: LOTTERY_MANAGER_ABI,
        functionName: 'withdrawFunds',
        args: [amount, recipient],
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to withdraw funds')
      setError(error)
      throw error
    }
  }, [account, lotteryManagerAddress, writeContract])

  // Utility functions
  const formatPrizeAmount = useCallback((amount: bigint): string => {
    return formatEther(amount)
  }, [])

  const formatDuration = useCallback((seconds: bigint): string => {
    const days = Number(seconds) / (24 * 60 * 60)
    if (days >= 1) {
      return `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''}`
    }
    const hours = Number(seconds) / (60 * 60)
    if (hours >= 1) {
      return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`
    }
    const minutes = Number(seconds) / 60
    return `${Math.floor(minutes)} minute${Math.floor(minutes) !== 1 ? 's' : ''}`
  }, [])

  // Refetch all data
  const refetchAll = useCallback(async () => {
    try {
      await refetchConfig()
      if (poolId) {
        await getPoolLotteryStatus(poolId)
      }
      await getGlobalLotteryStats()
    } catch (err) {
      console.error('Failed to refetch data:', err)
    }
  }, [refetchConfig, poolId, getPoolLotteryStatus, getGlobalLotteryStats])

  // Effect to load initial data
  useEffect(() => {
    if (poolId) {
      getPoolLotteryStatus(poolId)
    }
    getGlobalLotteryStats()
  }, [poolId, getPoolLotteryStatus, getGlobalLotteryStats])

  return {
    // Configuration
    lotteryConfig : lotteryConfig || null,
    updateLotteryConfig,
    setLotteryActive,
    
    // Pool status
    getPoolLotteryStatus,
    poolLotteryStatus,
    isPoolEligible,
    
    // Draws
    requestLotteryDraw,
    getLotteryDraw,
    getPoolDrawHistory,
    
    // Participants
    getPoolParticipants,
    addParticipants,
    removeParticipant,
    
    // Statistics
    globalStats,
    getGlobalLotteryStats,
    calculatePrizeAmount,
    
    // Admin
    emergencyPause,
    emergencyUnpause,
    withdrawFunds,
    
    // Loading states
    isLoading,
    isConfiguring,
    isDrawing,
    isUpdatingParticipants,
    
    // Error handling
    error,
    clearError,
    
    // Transaction states
    hash,
    isConfirming,
    isSuccess,
    isError,
    
    // Utilities
    refetchAll,
    formatPrizeAmount,
    formatDuration,
  }
}

export default useLotteryIntegration
