import { useMemo, useCallback } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { Address, parseEther, formatEther } from 'viem'
import { usePool } from './usePool'
import { PoolState } from '@/contracts/types'

export interface PoolDetailData {
  id: string
  name: string
  contributionAmount: string
  token: string
  frequency: string
  maxMembers: number
  currentRound: number
  totalRounds: number
  nextPayoutDate: string
  status: "Active" | "Completed" | "Pending" | "Open"
  members: Array<{
    address: string
    alias: string
    contributionStatus: "Paid" | "Unpaid" | "Received Payout"
    isCurrentReceiver: boolean
    joinedRound: number
  }>
  transactions: Array<{
    id: string
    type: "contribution" | "payout"
    round: number
    from: string
    to?: string
    amount: string
    token: string
    timestamp: string
    txHash: string
  }>
  userIsMember: boolean
  canLeave: boolean
  canJoin: boolean
  yieldEarned?: string
  apySource?: string
  totalValue: string
  userBalance: string
  payoutMode?: "fifo" | "random" | "voting"
  nextPayoutMember?: string
  shuffleInProgress?: boolean
  votingActive?: boolean
  votingEndTime?: string
  userVote?: string
  votes?: { [memberAddress: string]: number }
}

export interface UsePoolDetailReturn {
  poolData: PoolDetailData | null
  isLoading: boolean
  error: string | null
  joinPool: () => Promise<void>
  leavePool: () => Promise<void>
  isJoining: boolean
  isLeaving: boolean
  refetch: () => void
}

export function usePoolDetail(poolAddress: Address): UsePoolDetailReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  
  // Get user's ETH balance
  const { data: balanceData } = useBalance({
    address: account,
  })
  console.log(poolAddress)
  // Use the existing usePool hook for contract interactions
  const {
    poolInfo,
    joinPool: joinPoolContract,
    leavePool: leavePoolContract,
    isLoading: contractLoading,
    error: contractError,
    canJoin,
    canLeave,
  } = usePool(poolAddress)
//  wait until poolInfo is available
  console.log(poolInfo)

  // Transform contract data to UI format
 // Transform contract data to UI format
const poolData: PoolDetailData | null = useMemo(() => {
  // Early return if poolInfo is not available
  if (!poolInfo) return null

  const contributionAmountEth = formatEther(poolInfo.contributionAmount)
  const totalValueEth = formatEther(poolInfo.totalContributions + poolInfo.yieldGenerated)
  
  // Map pool state to UI status
  const getStatus = (state: PoolState): "Active" | "Completed" | "Pending" | "Open" => {
    switch (state) {
      case PoolState.Open:
        return "Open"
      case PoolState.Locked:
      case PoolState.Active:
        return "Active"
      case PoolState.Completed:
        return "Completed"
      default:
        return "Pending"
    }
  }

  // Create mock member data with real addresses
  const members = poolInfo.members.map((member, index) => {
    const isUser = member.member.toLowerCase() === account?.toLowerCase()
    const contributionStatus = member.hasWithdrawn ? "Received Payout" : "Paid"
    return {
      address: member.member,
      alias: isUser ? "You" : `Member ${index + 1}`,
      contributionStatus: contributionStatus as "Paid" | "Unpaid" | "Received Payout",
      isCurrentReceiver: index === 0 && poolInfo.state === PoolState.Active,
      joinedRound: 1,
    }
  })

  // Calculate approximate end date based on duration
  const endTime = poolInfo.createdAt + poolInfo.duration
  const nextPayoutDate = new Date(Number(endTime) * 1000).toISOString()

  // Create mock transaction data
  const transactions = poolInfo.members.map((member, index) => ({
    id: `${index + 1}`,
    type: "contribution" as const,
    round: 1,
    from: member.member,
    amount: contributionAmountEth,
    token: "ETH",
    timestamp: new Date(Number(member.joinedAt) * 1000).toISOString(),
    txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
  }))

  console.log(poolInfo)
  
  return {
    id: poolAddress,
    name: poolInfo.name || "Unnamed Pool",
    contributionAmount: contributionAmountEth || "0",
    token: "ETH",
    frequency: "Weekly",
    maxMembers: Number(poolInfo.maxMembers || 0n),
    currentRound: 1,
    totalRounds: Number(poolInfo.maxMembers || 0n),
    nextPayoutDate: nextPayoutDate || "Unknown",
    status: getStatus(poolInfo.state || 0),
    members: members || [],
    transactions: transactions || [],
    userIsMember: poolInfo.isUserMember || false,
    canLeave: canLeave || false,
    canJoin: canJoin || false,
    yieldEarned: formatEther(poolInfo.yieldGenerated || 0n),
    apySource: "Mock Yield",
    totalValue: totalValueEth || "0",
    userBalance: balanceData ? formatEther(balanceData.value) : "0",
    payoutMode: "random", // Mock payout mode
    nextPayoutMember: "Member 1", // Mock next payout member
    shuffleInProgress: false, // Mock shuffle in progress state
    votingActive: false, // Mock voting active state
    votingEndTime: nextPayoutDate || "Unknown", // Mock voting end time
    userVote: "1", // Mock user vote
    votes: {}, // Mock votes data
  }
}, [
  poolInfo,
  canJoin,
  canLeave,
  account,
  balanceData,
  poolAddress
])
console.log(poolData)
  // Wrapper functions for better error handling
  const joinPool = useCallback(async () => {
    if (!poolInfo) throw new Error('Pool data not available')
    if (!account) throw new Error('Wallet not connected')
    
    try {
      await joinPoolContract()
    } catch (error) {
      console.error('Failed to join pool:', error)
      throw error
    }
  }, [joinPoolContract, poolInfo, account])

  const leavePool = useCallback(async () => {
    if (!account) throw new Error('Wallet not connected')
    
    try {
      await leavePoolContract()
    } catch (error) {
      console.error('Failed to leave pool:', error)
      throw error
    }
  }, [leavePoolContract, account])

  const refetch = useCallback(() => {
    // The usePool hook handles refetching internally
    // This is a placeholder for manual refetch if needed
  }, [])

  return {
    poolData,
    isLoading: contractLoading,
    error: contractError?.message || null,
    joinPool,
    leavePool,
    isJoining: contractLoading,
    isLeaving: contractLoading,
    refetch,
  }
}
