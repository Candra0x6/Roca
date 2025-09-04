import { useState, useCallback, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { Address, formatEther } from 'viem'
import { YieldInfo } from '@/contracts/types'
import { useYieldManager, useYieldAPY, useTotalYield } from './useYieldManager'

export interface YieldEntry {
  timestamp: bigint
  poolAddress: Address
  poolName: string
  yieldAmount: bigint
  totalYield: bigint
  apy: number
}

export interface YieldChartData {
  date: string
  yield: number
  totalYield: number
  apy: number
}

export interface YieldStats {
  totalYieldEarned: bigint
  currentAPY: number
  totalContributions: bigint
  yieldToday: bigint
  yieldThisWeek: bigint
  yieldThisMonth: bigint
  activeInvestments: number
}

export interface UseYieldTrackingReturn {
  // Current yield data
  yieldStats: YieldStats
  yieldEntries: YieldEntry[]
  chartData: YieldChartData[]
  
  // Specific pool yield
  getPoolYield: (poolAddress: Address) => Promise<YieldInfo | null>
  updatePoolYield: (poolAddress: Address) => Promise<void>
  
  // Chart and analytics
  getYieldHistory: (days: number) => YieldChartData[]
  calculateProjectedYield: (principal: bigint, days: number) => bigint
  
  // Loading and error states
  isLoading: boolean
  error: Error | null
  
  // Actions
  refreshYieldData: () => Promise<void>
}

export function useYieldTracking(): UseYieldTrackingReturn {
  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()
  
  const [yieldEntries, setYieldEntries] = useState<YieldEntry[]>([])
  const [yieldStats, setYieldStats] = useState<YieldStats>({
    totalYieldEarned: 0n,
    currentAPY: 0,
    totalContributions: 0n,
    yieldToday: 0n,
    yieldThisWeek: 0n,
    yieldThisMonth: 0n,
    activeInvestments: 0,
  })
  const [chartData, setChartData] = useState<YieldChartData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get yield manager hooks
  const yieldManager = useYieldManager()
  const { apy, isLoading: isAPYLoading } = useYieldAPY()
  const { totalYield, isLoading: isTotalYieldLoading } = useTotalYield()

  // Get pool yield for specific pool
  const getPoolYield = useCallback(async (poolAddress: Address): Promise<YieldInfo | null> => {
    try {
      setError(null)
      
      // Use the existing yield manager hook to get yield info
      const yieldInfo = await yieldManager.yieldInfo
      return yieldInfo
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get pool yield')
      setError(error)
      return null
    }
  }, [yieldManager.yieldInfo])

  // Update yield for specific pool
  const updatePoolYield = useCallback(async (poolAddress: Address): Promise<void> => {
    try {
      setError(null)
      await yieldManager.updateYield(poolAddress)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update yield')
      setError(error)
      throw error
    }
  }, [yieldManager])

  // Generate mock yield history for demonstration
  const generateMockYieldHistory = useCallback((days: number = 30): YieldEntry[] => {
    const entries: YieldEntry[] = []
    const now = BigInt(Math.floor(Date.now() / 1000))
    const dayInSeconds = 86400n
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (BigInt(i) * dayInSeconds)
      const baseYield = 1000000000000000000n // 1 ETH in wei
      const randomMultiplier = Math.random() * 0.1 + 0.95 // 95% to 105%
      const yieldAmount = BigInt(Math.floor(Number(baseYield) * randomMultiplier))
      
      entries.push({
        timestamp,
        poolAddress: '0x0000000000000000000000000000000000000000' as Address,
        poolName: 'Mock Pool',
        yieldAmount,
        totalYield: yieldAmount * BigInt(days - i + 1),
        apy: 8.2, // Mock APY
      })
    }
    
    return entries
  }, [])

  // Convert yield entries to chart data
  const getYieldHistory = useCallback((days: number = 30): YieldChartData[] => {
    const relevantEntries = yieldEntries.slice(-days)
    
    return relevantEntries.map(entry => ({
      date: new Date(Number(entry.timestamp) * 1000).toISOString().split('T')[0],
      yield: Number(formatEther(entry.yieldAmount)),
      totalYield: Number(formatEther(entry.totalYield)),
      apy: entry.apy,
    }))
  }, [yieldEntries])

  // Calculate projected yield based on current APY
  const calculateProjectedYield = useCallback((principal: bigint, days: number): bigint => {
    const currentAPY = typeof apy === 'number' ? apy : Number(apy) || 0
    if (!currentAPY || currentAPY === 0) return 0n
    
    const annualYield = (principal * BigInt(Math.floor(currentAPY * 100))) / 10000n
    const dailyYield = annualYield / 365n
    return dailyYield * BigInt(days)
  }, [apy])

  // Calculate yield stats from entries
  const calculateYieldStats = useCallback((entries: YieldEntry[]): YieldStats => {
    const currentAPY = typeof apy === 'number' ? apy : Number(apy) || 0
    
    if (entries.length === 0) {
      return {
        totalYieldEarned: 0n,
        currentAPY,
        totalContributions: 0n,
        yieldToday: 0n,
        yieldThisWeek: 0n,
        yieldThisMonth: 0n,
        activeInvestments: 0,
      }
    }

    const now = Math.floor(Date.now() / 1000)
    const dayAgo = now - 86400
    const weekAgo = now - (86400 * 7)
    const monthAgo = now - (86400 * 30)

    const totalYieldEarned = entries.reduce((sum, entry) => sum + entry.yieldAmount, 0n)
    
    const yieldToday = entries
      .filter(entry => Number(entry.timestamp) >= dayAgo)
      .reduce((sum, entry) => sum + entry.yieldAmount, 0n)
    
    const yieldThisWeek = entries
      .filter(entry => Number(entry.timestamp) >= weekAgo)
      .reduce((sum, entry) => sum + entry.yieldAmount, 0n)
    
    const yieldThisMonth = entries
      .filter(entry => Number(entry.timestamp) >= monthAgo)
      .reduce((sum, entry) => sum + entry.yieldAmount, 0n)

    return {
      totalYieldEarned,
      currentAPY,
      totalContributions: totalYield || 0n,
      yieldToday,
      yieldThisWeek,
      yieldThisMonth,
      activeInvestments: entries.length,
    }
  }, [apy, totalYield])

  // Refresh all yield data
  const refreshYieldData = useCallback(async () => {
    if (!isConnected || !userAddress) return

    try {
      setIsLoading(true)
      setError(null)

      // For now, use mock data until we have more sophisticated yield tracking
      const mockEntries = generateMockYieldHistory(30)
      setYieldEntries(mockEntries)

      // Calculate stats from entries
      const stats = calculateYieldStats(mockEntries)
      setYieldStats(stats)

      // Generate chart data
      const chartData = getYieldHistory(30)
      setChartData(chartData)

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh yield data')
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, userAddress, generateMockYieldHistory, calculateYieldStats, getYieldHistory])

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (isConnected && userAddress) {
      refreshYieldData()
    }
  }, [isConnected, userAddress, refreshYieldData])

  // Update chart data when yield entries change
  useEffect(() => {
    if (yieldEntries.length > 0) {
      const newChartData = getYieldHistory(30)
      setChartData(newChartData)
    }
  }, [yieldEntries, getYieldHistory])

  // Combine loading states
  const totalIsLoading = isLoading || isAPYLoading || isTotalYieldLoading || yieldManager.isLoading

  return {
    yieldStats,
    yieldEntries,
    chartData,
    getPoolYield,
    updatePoolYield,
    getYieldHistory,
    calculateProjectedYield,
    isLoading: totalIsLoading,
    error: error || yieldManager.error,
    refreshYieldData,
  }
}
