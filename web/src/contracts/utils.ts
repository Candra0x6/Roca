import { Address, formatEther, parseEther } from 'viem'
import { PoolState, BadgeType } from './types'

// Utility functions for contract interactions

// Pool utilities
export function formatPoolState(state: PoolState): string {
  switch (state) {
    case PoolState.Open:
      return 'Open'
    case PoolState.Locked:
      return 'Locked'
    case PoolState.Active:
      return 'Active'
    case PoolState.Completed:
      return 'Completed'
    default:
      return 'Unknown'
  }
}

export function getPoolStateColor(state: PoolState): string {
  switch (state) {
    case PoolState.Open:
      return 'green'
    case PoolState.Locked:
      return 'yellow'
    case PoolState.Active:
      return 'blue'
    case PoolState.Completed:
      return 'gray'
    default:
      return 'gray'
  }
}

export function isPoolJoinable(state: PoolState): boolean {
  return state === PoolState.Open
}

export function isPoolActive(state: PoolState): boolean {
  return state === PoolState.Active
}

export function isPoolCompleted(state: PoolState): boolean {
  return state === PoolState.Completed
}

// Badge utilities
export function formatBadgeType(badgeType: BadgeType): string {
  switch (badgeType) {
    case BadgeType.JoinBadge:
      return 'Pool Joiner'
    case BadgeType.LotteryWinnerBadge:
      return 'Lottery Winner'
    case BadgeType.PoolCompletionBadge:
      return 'Pool Completionist'
    default:
      return 'Unknown Badge'
  }
}

export function getBadgeIcon(badgeType: BadgeType): string {
  switch (badgeType) {
    case BadgeType.JoinBadge:
      return '🎯'
    case BadgeType.LotteryWinnerBadge:
      return '🏆'
    case BadgeType.PoolCompletionBadge:
      return '✅'
    default:
      return '🏅'
  }
}

export function getBadgeDescription(badgeType: BadgeType): string {
  switch (badgeType) {
    case BadgeType.JoinBadge:
      return 'Awarded for joining a savings pool'
    case BadgeType.LotteryWinnerBadge:
      return 'Awarded for winning a weekly lottery draw'
    case BadgeType.PoolCompletionBadge:
      return 'Awarded for successfully completing a savings pool'
    default:
      return 'Special achievement badge'
  }
}

// Time utilities
export function formatTimeRemaining(endTime: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const timeLeft = endTime - now

  if (timeLeft <= 0) {
    return 'Ended'
  }

  const days = Number(timeLeft) / (24 * 60 * 60)
  const hours = (Number(timeLeft) % (24 * 60 * 60)) / (60 * 60)
  const minutes = (Number(timeLeft) % (60 * 60)) / 60

  if (days >= 1) {
    return `${Math.floor(days)}d ${Math.floor(hours)}h`
  } else if (hours >= 1) {
    return `${Math.floor(hours)}h ${Math.floor(minutes)}m`
  } else {
    return `${Math.floor(minutes)}m`
  }
}

export function isPoolExpired(endTime: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return endTime <= now
}

// Yield utilities
export function calculateAPY(principal: bigint, yieldGenerated: bigint, timeElapsed: bigint): number {
  if (principal === 0n || timeElapsed === 0n) return 0

  const principalEth = Number(formatEther(principal))
  const yieldEth = Number(formatEther(yieldGenerated))
  const timeElapsedYears = Number(timeElapsed) / (365 * 24 * 60 * 60)

  if (timeElapsedYears === 0) return 0

  return (yieldEth / principalEth) / timeElapsedYears * 100
}

export function calculateProjectedYield(principal: bigint, apy: number, duration: bigint): bigint {
  const principalEth = Number(formatEther(principal))
  const durationYears = Number(duration) / (365 * 24 * 60 * 60)
  const projectedYieldEth = principalEth * (apy / 100) * durationYears
  return parseEther(projectedYieldEth.toString())
}

// Address utilities
export function shortenAddress(address: Address, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Amount utilities
export function formatAmount(amount: bigint, decimals = 4): string {
  const formatted = formatEther(amount)
  const num = parseFloat(formatted)
  return num.toFixed(decimals)
}

export function parseAmount(amount: string): bigint {
  try {
    return parseEther(amount)
  } catch {
    return 0n
  }
}

// Percentage utilities
export function calculatePercentage(part: bigint, total: bigint): number {
  if (total === 0n) return 0
  return Number((part * 100n) / total)
}

export function formatPercentage(percentage: number, decimals = 2): string {
  return `${percentage.toFixed(decimals)}%`
}

// Error utilities
export function parseContractError(error: Error): string {
  const message = error.message

  // Common contract error patterns
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds to complete transaction'
  }
  if (message.includes('Pool is full')) {
    return 'This pool is already full'
  }
  if (message.includes('Pool is not open')) {
    return 'Pool is not accepting new members'
  }
  if (message.includes('Already a member')) {
    return 'You are already a member of this pool'
  }
  if (message.includes('Not a member')) {
    return 'You are not a member of this pool'
  }
  if (message.includes('Pool not completed')) {
    return 'Pool has not completed yet'
  }
  if (message.includes('Already withdrawn')) {
    return 'You have already withdrawn your funds'
  }
  if (message.includes('User rejected')) {
    return 'Transaction was rejected by user'
  }

  // Default fallback
  return 'Transaction failed. Please try again.'
}

// Validation utilities
export function validatePoolCreation(
  name: string,
  contributionAmount: string,
  maxMembers: number,
  duration: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!name || name.trim().length === 0) {
    errors.push('Pool name is required')
  }
  if (name.length > 50) {
    errors.push('Pool name must be 50 characters or less')
  }

  if (!contributionAmount || contributionAmount === '0') {
    errors.push('Contribution amount is required')
  }
  try {
    const amount = parseEther(contributionAmount)
    if (amount <= 0n) {
      errors.push('Contribution amount must be greater than 0')
    }
  } catch {
    errors.push('Invalid contribution amount')
  }

  if (maxMembers < 2) {
    errors.push('Pool must have at least 2 members')
  }
  if (maxMembers > 100) {
    errors.push('Pool cannot have more than 100 members')
  }

  if (duration < 7 * 24 * 60 * 60) {
    errors.push('Pool duration must be at least 1 week')
  }
  if (duration > 365 * 24 * 60 * 60) {
    errors.push('Pool duration cannot exceed 1 year')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Constants
export const POOL_CONSTANTS = {
  MIN_MEMBERS: 2,
  MAX_MEMBERS: 100,
  MIN_DURATION: 7 * 24 * 60 * 60, // 1 week
  MAX_DURATION: 365 * 24 * 60 * 60, // 1 year
  MIN_CONTRIBUTION: parseEther('0.001'), // 0.001 ETH
  MAX_CONTRIBUTION: parseEther('10'), // 10 ETH
  LOTTERY_FREQUENCY: 7 * 24 * 60 * 60, // 1 week
} as const
