import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Address, parseEther } from 'viem'
import { 
  usePoolFactory, 
  usePool, 
  useBadge, 
  useLottery, 
  useYieldManager,
  CreatePoolParams 
} from '@/hooks'
import { 
  formatPoolState, 
  formatAmount, 
  formatTimeRemaining,
  shortenAddress 
} from '@/contracts'

interface ContractTestComponentProps {
  testPoolAddress?: Address
}

export function ContractTestComponent({ testPoolAddress }: ContractTestComponentProps) {
  const { address: account, isConnected } = useAccount()
  
  // Pool Factory hooks
  const { pools, createPool, isLoading: isCreatingPool, error: poolFactoryError } = usePoolFactory()
  
  // Pool hook (using first pool if testPoolAddress not provided)
  const poolAddress = testPoolAddress || pools[0]
  const { 
    poolInfo, 
    joinPool, 
    leavePool, 
    withdrawFunds,
    canJoin,
    canLeave,
    canWithdraw,
    isLoading: isPoolLoading,
    error: poolError 
  } = usePool(poolAddress)
  
  // Badge hook
  const { badges, isLoading: isBadgeLoading, error: badgeError } = useBadge()
  
  // Lottery hook
  const { 
    currentRound, 
    pastRounds, 
    drawLottery,
    isLoading: isLotteryLoading,
    error: lotteryError 
  } = useLottery(poolAddress)
  
  // Yield Manager hook
  const { 
    yieldInfo, 
    updateYield,
    isLoading: isYieldLoading,
    error: yieldError 
  } = useYieldManager(poolAddress)

  // Test create pool
  const handleCreatePool = async () => {
    if (!isConnected) return
    
    try {
      const params: CreatePoolParams = {
        name: "Test Pool",
        contributionAmount: parseEther("0.1"),
        maxMembers: 5n,
        duration: 30n * 24n * 60n * 60n, // 30 days
      }
      
      const newPoolAddress = await createPool(params)
      console.log('Pool created:', newPoolAddress)
    } catch (error) {
      console.error('Failed to create pool:', error)
    }
  }

  // Test join pool
  const handleJoinPool = async () => {
    if (!canJoin) return
    
    try {
      await joinPool()
      console.log('Successfully joined pool')
    } catch (error) {
      console.error('Failed to join pool:', error)
    }
  }

  // Test leave pool
  const handleLeavePool = async () => {
    if (!canLeave) return
    
    try {
      await leavePool()
      console.log('Successfully left pool')
    } catch (error) {
      console.error('Failed to leave pool:', error)
    }
  }

  // Test withdraw
  const handleWithdraw = async () => {
    if (!canWithdraw) return
    
    try {
      await withdrawFunds()
      console.log('Successfully withdrew funds')
    } catch (error) {
      console.error('Failed to withdraw funds:', error)
    }
  }

  // Test draw lottery
  const handleDrawLottery = async () => {
    if (!poolAddress) return
    
    try {
      await drawLottery(poolAddress)
      console.log('Lottery drawn successfully')
    } catch (error) {
      console.error('Failed to draw lottery:', error)
    }
  }

  // Test update yield
  const handleUpdateYield = async () => {
    if (!poolAddress) return
    
    try {
      await updateYield(poolAddress)
      console.log('Yield updated successfully')
    } catch (error) {
      console.error('Failed to update yield:', error)
    }
  }

  useEffect(() => {
    console.log('Contract Test Component mounted')
    console.log('Connected account:', account)
    console.log('Available pools:', pools)
    console.log('Current pool info:', poolInfo)
    console.log('User badges:', badges)
    console.log('Current lottery round:', currentRound)
    console.log('Yield info:', yieldInfo)
  }, [account, pools, poolInfo, badges, currentRound, yieldInfo])

  if (!isConnected) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Contract Test Component</h2>
        <p>Please connect your wallet to test contract interactions.</p>
      </div>
    )
  }

  const isLoading = isCreatingPool || isPoolLoading || isBadgeLoading || isLotteryLoading || isYieldLoading
  const hasError = poolFactoryError || poolError || badgeError || lotteryError || yieldError

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Contract Test Component</h2>
      
      {/* Account Info */}
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Account Info</h3>
        <p>Connected: {shortenAddress(account!)}</p>
        <p>Total Pools: {pools.length}</p>
        <p>Total Badges: {badges.length}</p>
      </div>

      {/* Pool Factory */}
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Pool Factory</h3>
        <button 
          onClick={handleCreatePool}
          disabled={isCreatingPool}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isCreatingPool ? 'Creating...' : 'Create Test Pool'}
        </button>
        {poolFactoryError && (
          <p className="text-red-500 mt-2">Error: {poolFactoryError.message}</p>
        )}
      </div>

      {/* Pool Info */}
      {poolInfo && (
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Pool Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Name: {poolInfo.name}</p>
            <p>State: {formatPoolState(poolInfo.state)}</p>
            <p>Members: {poolInfo.currentMembers.toString()}/{poolInfo.maxMembers.toString()}</p>
            <p>Contribution: {formatAmount(poolInfo.contributionAmount)} ETH</p>
            <p>Total: {formatAmount(poolInfo.totalContributions)} ETH</p>
            <p>Yield: {formatAmount(poolInfo.yieldGenerated)} ETH</p>
            <p>Time Left: {formatTimeRemaining(poolInfo.endTime)}</p>
            <p>Creator: {shortenAddress(poolInfo.creator)}</p>
          </div>
          
          <div className="mt-4 space-x-2">
            <button 
              onClick={handleJoinPool}
              disabled={!canJoin || isPoolLoading}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isPoolLoading ? 'Processing...' : 'Join Pool'}
            </button>
            <button 
              onClick={handleLeavePool}
              disabled={!canLeave || isPoolLoading}
              className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isPoolLoading ? 'Processing...' : 'Leave Pool'}
            </button>
            <button 
              onClick={handleWithdraw}
              disabled={!canWithdraw || isPoolLoading}
              className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isPoolLoading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
          
          {poolError && (
            <p className="text-red-500 mt-2">Error: {poolError.message}</p>
          )}
        </div>
      )}

      {/* Lottery Info */}
      {currentRound && (
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Lottery Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Round: {currentRound.round.toString()}</p>
            <p>Prize: {formatAmount(currentRound.prizeAmount)} ETH</p>
            <p>Winner: {currentRound.winner !== '0x0000000000000000000000000000000000000000' ? shortenAddress(currentRound.winner) : 'Not drawn'}</p>
            <p>Participants: {currentRound.participants.length}</p>
          </div>
          
          <button 
            onClick={handleDrawLottery}
            disabled={isLotteryLoading}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50 mt-4"
          >
            {isLotteryLoading ? 'Drawing...' : 'Draw Lottery'}
          </button>
          
          {lotteryError && (
            <p className="text-red-500 mt-2">Error: {lotteryError.message}</p>
          )}
        </div>
      )}

      {/* Yield Info */}
      {yieldInfo && (
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Yield Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Principal: {formatAmount(yieldInfo.principal)} ETH</p>
            <p>Yield Generated: {formatAmount(yieldInfo.yieldGenerated)} ETH</p>
            <p>Active: {yieldInfo.isActive ? 'Yes' : 'No'}</p>
            <p>Last Update: {new Date(Number(yieldInfo.lastUpdateTime) * 1000).toLocaleString()}</p>
          </div>
          
          <button 
            onClick={handleUpdateYield}
            disabled={isYieldLoading}
            className="bg-indigo-500 text-white px-4 py-2 rounded disabled:opacity-50 mt-4"
          >
            {isYieldLoading ? 'Updating...' : 'Update Yield'}
          </button>
          
          {yieldError && (
            <p className="text-red-500 mt-2">Error: {yieldError.message}</p>
          )}
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">My Badges</h3>
          <div className="space-y-2">
            {badges.map((badge, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className="text-2xl">{badge.badgeType === 0 ? '🎯' : badge.badgeType === 1 ? '🏆' : '✅'}</span>
                <span>Token ID: {badge.tokenId.toString()}</span>
                <span>Type: {badge.badgeType === 0 ? 'Join Badge' : badge.badgeType === 1 ? 'Lottery Winner' : 'Pool Completion'}</span>
              </div>
            ))}
          </div>
          
          {badgeError && (
            <p className="text-red-500 mt-2">Error: {badgeError.message}</p>
          )}
        </div>
      )}

      {/* General Loading/Error States */}
      {isLoading && (
        <div className="border p-4 rounded-lg">
          <p className="text-blue-500">Loading contract data...</p>
        </div>
      )}

      {hasError && (
        <div className="border border-red-500 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-red-500 mb-2">Errors</h3>
          {poolFactoryError && <p className="text-red-500 text-sm">Pool Factory: {poolFactoryError.message}</p>}
          {poolError && <p className="text-red-500 text-sm">Pool: {poolError.message}</p>}
          {badgeError && <p className="text-red-500 text-sm">Badge: {badgeError.message}</p>}
          {lotteryError && <p className="text-red-500 text-sm">Lottery: {lotteryError.message}</p>}
          {yieldError && <p className="text-red-500 text-sm">Yield: {yieldError.message}</p>}
        </div>
      )}
    </div>
  )
}
