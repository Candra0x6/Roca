import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboard } from '@/hooks/useDashboard'
import { useYieldTracking } from '@/hooks/useYieldTracking'

// Mock the wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
    isConnected: true,
  })),
  useChainId: vi.fn(() => 1),
}))

// Mock the other hooks
vi.mock('@/hooks/usePoolFactory', () => ({
  useUserPools: vi.fn(() => ({
    poolIds: [1n, 2n],
    isLoading: false,
    error: null,
  })),
  usePoolStatistics: vi.fn(() => ({
    statistics: {
      totalPools: 10n,
      activePools: 5n,
      completedPools: 5n,
    },
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useBadge', () => ({
  useBadge: vi.fn(() => ({
    badges: [
      {
        tokenId: 1n,
        badgeType: 0,
        poolAddress: '0x1234567890123456789012345678901234567890',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
        timestamp: 1640995200n,
      },
    ],
    isLoading: false,
    error: null,
  })),
}))

vi.mock('@/hooks/useYieldManager', () => ({
  useYieldManager: vi.fn(() => ({
    yieldInfo: null,
    updateYield: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useYieldAPY: vi.fn(() => ({
    apy: 8.2,
    isLoading: false,
  })),
  useTotalYield: vi.fn(() => ({
    totalYield: 1000000000000000000n, // 1 ETH
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useLottery', () => ({
  useLottery: vi.fn(() => ({
    pastRounds: [],
    isLoading: false,
  })),
}))

describe('Dashboard Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useDashboard', () => {
    it('should return dashboard data correctly', async () => {
      const { result } = renderHook(() => useDashboard())

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.userAddress).toBe('0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c')
        expect(result.current.dashboardStats.totalBadges).toBe(1)
      })
    })

    it('should handle loading states', () => {
      const { result } = renderHook(() => useDashboard())
      
      // Initially should not be loading if mocks return immediately
      expect(typeof result.current.isLoading).toBe('boolean')
    })
  })

  describe('useYieldTracking', () => {
    it('should return yield tracking data correctly', async () => {
      const { result } = renderHook(() => useYieldTracking())

      await waitFor(() => {
        expect(result.current.yieldStats).toBeDefined()
        expect(result.current.yieldStats.currentAPY).toBe(8.2)
      })
    })

    it('should provide refresh functionality', () => {
      const { result } = renderHook(() => useYieldTracking())
      
      expect(typeof result.current.refreshYieldData).toBe('function')
    })

    it('should calculate projected yield correctly', async () => {
      const { result } = renderHook(() => useYieldTracking())

      await waitFor(() => {
        const principal = 1000000000000000000n // 1 ETH
        const days = 365
        const projected = result.current.calculateProjectedYield(principal, days)
        
        // Should calculate some yield for 1 ETH over 1 year at 8.2% APY
        expect(projected).toBeGreaterThan(0n)
      })
    })
  })
})

describe('Hook Integration', () => {
  it('should work together for dashboard functionality', async () => {
    const dashboardResult = renderHook(() => useDashboard())
    const yieldResult = renderHook(() => useYieldTracking())

    await waitFor(() => {
      // Both hooks should work independently
      expect(dashboardResult.result.current.isConnected).toBe(true)
      expect(yieldResult.result.current.yieldStats).toBeDefined()
    })
  })
})
