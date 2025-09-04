import { useState } from 'react'
import { useChainId } from 'wagmi'
import { hardhat } from 'wagmi/chains'

export function useTimeSimulation() {
  const [isSimulating, setIsSimulating] = useState(false)
  const chainId = useChainId()

  const getBlockchainTime = async (): Promise<number> => {
    try {
      const hardhatUrl = 'http://localhost:8545'
      
      const response = await fetch(hardhatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error.message)
      }

      // Convert hex timestamp to decimal and return in milliseconds
      return parseInt(result.result.timestamp, 16) * 1000
    } catch (error) {
      console.error('Failed to get blockchain time:', error)
      // Fallback to system time if blockchain time is not available
      return Date.now()
    }
  }

  const simulateTimeIncrease = async (seconds: number) => {
    if (chainId !== hardhat.id) {
      throw new Error('Time simulation only available on local hardhat network')
    }

    setIsSimulating(true)
    
    try {
      // Call Hardhat node directly instead of through MetaMask
      const hardhatUrl = 'http://localhost:8545' // Default Hardhat node URL
      
      // Increase time
      const increaseTimeResponse = await fetch(hardhatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'evm_increaseTime',
          params: [seconds],
        }),
      })

      if (!increaseTimeResponse.ok) {
        throw new Error(`HTTP error! status: ${increaseTimeResponse.status}`)
      }

      const increaseTimeResult = await increaseTimeResponse.json()
      if (increaseTimeResult.error) {
        throw new Error(increaseTimeResult.error.message)
      }

      // Mine a new block to apply the time change
      const mineResponse = await fetch(hardhatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'evm_mine',
          params: [],
        }),
      })

      if (!mineResponse.ok) {
        throw new Error(`HTTP error! status: ${mineResponse.status}`)
      }

      const mineResult = await mineResponse.json()
      if (mineResult.error) {
        throw new Error(mineResult.error.message)
      }

      console.log(`⏰ Time increased by ${seconds} seconds (${Math.floor(seconds / (24 * 60 * 60))} days)`)
      
      return true
    } catch (error) {
      console.error('Time simulation failed:', error)
      throw error
    } finally {
      setIsSimulating(false)
    }
  }

  const simulateDays = async (days: number) => {
    const seconds = days * 24 * 60 * 60
    return simulateTimeIncrease(seconds)
  }

  const simulateHours = async (hours: number) => {
    const seconds = hours * 60 * 60
    return simulateTimeIncrease(seconds)
  }

  const fastEndPool = async (poolCreatedAt: bigint, poolDuration: bigint) => {
    if (chainId !== hardhat.id) {
      throw new Error('Time simulation only available on local hardhat network')
    }

    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const createdAtSeconds = Number(poolCreatedAt)
    const durationSeconds = Number(poolDuration)
    const endTime = createdAtSeconds + durationSeconds
    
    // Calculate how much time we need to fast-forward to reach the end + a buffer
    const timeToEnd = endTime - now + 60 // Add 60 seconds buffer to ensure pool has ended
    
    if (timeToEnd <= 0) {
      throw new Error('Pool has already ended')
    }

    console.log(`⏰ Fast-forwarding ${timeToEnd} seconds to end pool...`)
    return simulateTimeIncrease(timeToEnd)
  }

  const isHardhatNetwork = chainId === hardhat.id

  return {
    simulateTimeIncrease,
    simulateDays,
    simulateHours,
    fastEndPool,
    getBlockchainTime,
    isSimulating,
    isHardhatNetwork,
  }
}
