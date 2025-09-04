import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePoolAddress } from '../hooks/usePoolAddress'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useReadContract: vi.fn(() => ({
    data: '0x1234567890123456789012345678901234567890',
    isLoading: false,
    error: null,
  })),
  useChainId: vi.fn(() => 31337),
}))

describe('usePoolAddress', () => {
  it('should return pool address for valid pool ID', () => {
    const { result } = renderHook(() => usePoolAddress('1'))
    
    expect(result.current.poolAddress).toBe('0x1234567890123456789012345678901234567890')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should handle invalid pool ID', () => {
    const { result } = renderHook(() => usePoolAddress('invalid'))
    
    // Should not call the contract with invalid ID
    expect(result.current.poolAddress).toBeNull()
  })
})
