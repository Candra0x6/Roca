/**
 * @title Lottery Integration Component
 * @dev Complete lottery system interface for pool pages
 * 
 * This component provides a comprehensive lottery interface that mirrors
 * the functionality from the lottery integration test:
 * 
 * - Display lottery configuration and status
 * - Show pool lottery eligibility and participants
 * - Provide lottery draw controls (admin only)
 * - Display lottery statistics and history
 * - Show prize calculations and distributions
 * 
 * Based on the lottery integration test flow
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatEther, Address } from "viem"
import { 
  Trophy, 
  Users, 
  DollarSign, 
  Clock, 
  Settings, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Gift,
  Crown,
  Target,
  BarChart3,
  Calendar,
  Coins
} from "lucide-react"

import { useLotteryIntegration, usePoolLotteryEligibility, type LotteryConfig, type PoolLotteryStatus } from "@/hooks"
import { useAccount } from "wagmi"

interface LotteryIntegrationProps {
  poolAddress: Address
  poolId: bigint
  poolName: string
  isAdmin?: boolean
  isCreator?: boolean
  currentYield?: bigint
  totalContributions?: bigint
  poolMembers?: number
}

export default function LotteryIntegration({
  poolAddress,
  poolId,
  poolName,
  isAdmin = false,
  isCreator = false,
  currentYield = 0n,
  totalContributions = 0n,
  poolMembers = 0
}: LotteryIntegrationProps) {
  const { address: account, isConnected } = useAccount()
  
  const {
    // Configuration
    lotteryConfig,
    updateLotteryConfig,
    setLotteryActive,
    
    // Pool status
    poolLotteryStatus,
    getPoolLotteryStatus,
    isPoolEligible,
    
    // Draws
    requestLotteryDraw,
    getPoolDrawHistory,
    
    // Participants
    getPoolParticipants,
    
    // Statistics
    globalStats,
    getGlobalLotteryStats,
    calculatePrizeAmount,
    
    // Loading states
    isLoading,
    isConfiguring,
    isDrawing,
    
    // Error handling
    error,
    clearError,
    
    // Utilities
    refetchAll,
    formatPrizeAmount,
    formatDuration,
  } = useLotteryIntegration(poolAddress, poolId)

    const { isEligible: isLotteryEligible } = usePoolLotteryEligibility(poolId)
  
  // Component state
  const [showConfig, setShowConfig] = useState(false)
  const [participants, setParticipants] = useState<Address[]>([])
  const [estimatedPrize, setEstimatedPrize] = useState<bigint>(0n)
  const [drawHistory, setDrawHistory] = useState<any[]>([])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!poolId) return

      try {
        // Load pool lottery status
        await getPoolLotteryStatus(poolId)
        
        // Load participants
        const poolParticipants = await getPoolParticipants(poolId)
        setParticipants(poolParticipants)
        console.log("Pool Participants for Pool ID", poolId.toString(), ":", poolParticipants)
        // Calculate estimated prize
        if (currentYield > 0n) {
          const prize = await calculatePrizeAmount(poolId, currentYield)
          setEstimatedPrize(prize)
        }
        
        // Load draw history
        const history = await getPoolDrawHistory(poolId)
        setDrawHistory(history)
      } catch (err) {
        console.error('Failed to load lottery data:', err)
      }
    }

    loadData()
  }, [poolId, getPoolLotteryStatus, getPoolParticipants, calculatePrizeAmount, getPoolDrawHistory, currentYield])

  // Refresh data
  const handleRefresh = async () => {
    try {
      await refetchAll()
      toast.success("Lottery data refreshed")
    } catch (err) {
      toast.error("Failed to refresh lottery data")
    }
  }

  // Handle lottery draw
  const handleDrawLottery = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet")
      return
    }

    try {
      await requestLotteryDraw(poolId)
      toast.success("Lottery draw requested successfully!")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to request lottery draw"
      toast.error(message)
    }
  }

  // Handle configuration update
  const handleConfigUpdate = async (newConfig: LotteryConfig) => {
    if (!isAdmin) {
      toast.error("Admin access required")
      return
    }

    try {
      await updateLotteryConfig(newConfig)
      toast.success("Lottery configuration updated")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update configuration"
      toast.error(message)
    }
  }

  // Handle lottery activation toggle
  const handleToggleActive = async () => {
    if (!isAdmin) {
      toast.error("Admin access required")
      return
    }

    try {
      const newStatus = !lotteryConfig?.isActive
      await setLotteryActive(newStatus)
      toast.success(`Lottery ${newStatus ? 'activated' : 'deactivated'}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle lottery status"
      toast.error(message)
    }
  }

  // Get lottery status display
  const getLotteryStatusDisplay = () => {
    if (!lotteryConfig) return { text: "Loading...", color: "bg-gray-500", icon: RefreshCw }
    
    if (!lotteryConfig.isActive) {
      return { text: "Inactive", color: "bg-red-500", icon: XCircle }
    }
    
    if (isLotteryEligible) {
      return { text: "Eligible", color: "bg-green-500", icon: CheckCircle }
    }
    
    return { text: "Not Eligible", color: "bg-yellow-500", icon: AlertTriangle }
  }

  console.log(poolLotteryStatus)
  const statusDisplay = getLotteryStatusDisplay()
  console.log(participants)
  if (isLoading && !lotteryConfig) {
    return (
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            Lottery System
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Lottery Status Card */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-white">Lottery System</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                className={`${statusDisplay.color} text-white border-0`}
              >
                <statusDisplay.icon className="w-3 h-3 mr-1" />
                {statusDisplay.text}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-neutral-700 hover:bg-neutral-800"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription className="text-neutral-400">
            Pool lottery integration - {poolName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Overview */}
          {lotteryConfig && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                  <Clock className="w-4 h-4" />
                  Draw Interval
                </div>
                <div className="text-white font-semibold">
                  {formatDuration(lotteryConfig.drawInterval)}
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Prize %
                </div>
                <div className="text-white font-semibold">
                  {(Number(lotteryConfig.prizePercentage) / 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                  <Users className="w-4 h-4" />
                  Min Pool Size
                </div>
                <div className="text-white font-semibold">
                  {lotteryConfig.minPoolSize.toString()}
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                  <Coins className="w-4 h-4" />
                  Max Prize
                </div>
                <div className="text-white font-semibold">
                  {formatPrizeAmount(lotteryConfig.maxPrizeAmount)} ETH
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-neutral-700" />

          {/* Pool Lottery Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5" />
              Pool Lottery Status
            </h3>
              
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Users className="w-4 h-4" />
                  Participants
                </div>
                <div className="text-2xl font-bold text-white">
                  {/* @ts-ignore */}
                  {participants !== '0x' ? participants.length : '0'} / {String(poolMembers) || '0'}
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  Registered in lottery
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Gift className="w-4 h-4" />
                  Estimated Prize
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatPrizeAmount(estimatedPrize)} ETH
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  Based on current yield
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Crown className="w-4 h-4" />
                  Eligibility
                </div>
                <div className="text-2xl font-bold text-white">
                  {poolLotteryStatus?.isEligible ? "Yes" : "No"}
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  {participants.length >= Number(lotteryConfig?.minPoolSize || 0) 
                    ? "Meets requirements" 
                    : `Need ${Number(lotteryConfig?.minPoolSize || 0) - participants.length} more`}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {(isAdmin || isCreator) && isLotteryEligible && (
              <Button
                onClick={handleDrawLottery}
                disabled={isDrawing || !isConnected}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isDrawing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Drawing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Request Draw
                  </>
                )}
              </Button>
            )}
            
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowConfig(!showConfig)}
                className="border-neutral-700 hover:bg-neutral-800"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showConfig ? "Hide" : "Show"} Config
              </Button>
            )}
          </div>

          {/* Configuration Panel (Admin Only) */}
          {showConfig && isAdmin && lotteryConfig && (
            <div className="bg-neutral-800/30 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Lottery Configuration
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Status</label>
                  <Button
                    variant={lotteryConfig.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={handleToggleActive}
                    disabled={isConfiguring}
                    className="w-full"
                  >
                    {lotteryConfig.isActive ? "Deactivate" : "Activate"} Lottery
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Current Settings</label>
                  <div className="text-sm text-white space-y-1">
                    <div>Draw Interval: {formatDuration(lotteryConfig.drawInterval)}</div>
                    <div>Prize %: {(Number(lotteryConfig.prizePercentage) / 100).toFixed(1)}%</div>
                    <div>Min Pool: {lotteryConfig.minPoolSize.toString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Global Statistics */}
          {globalStats && (
            <div className="space-y-4">
              <Separator className="bg-neutral-700" />
              
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Global Lottery Statistics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <div className="text-sm text-neutral-400 mb-1">Total Draws</div>
                  <div className="text-xl font-bold text-white">
                    {globalStats.totalDraws.toString()}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <div className="text-sm text-neutral-400 mb-1">Total Prizes</div>
                  <div className="text-xl font-bold text-white">
                    {formatPrizeAmount(globalStats.totalPrizesDistributed)} ETH
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <div className="text-sm text-neutral-400 mb-1">Total Participants</div>
                  <div className="text-xl font-bold text-white">
                    {globalStats.totalParticipants.toString()}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <div className="text-sm text-neutral-400 mb-1">Avg Prize</div>
                  <div className="text-xl font-bold text-white">
                    {formatPrizeAmount(globalStats.averagePrizeAmount)} ETH
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Error
              </div>
              <div className="text-red-300 text-sm">{error.message}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="mt-2 border-red-500/30 text-red-400 hover:bg-red-900/30"
              >
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants List */}
      {/* @ts-ignore */}
      {participants?.length > 0 && participants !== '0x' && (
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lottery Participants ({participants.length})
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Addresses registered for lottery draws
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {participants.map((participant, index) => (
                <div 
                  key={participant}
                  className="flex items-center justify-between bg-neutral-800/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="font-mono text-sm text-white">
                      {participant.slice(0, 6)}...{participant.slice(-4)}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-neutral-600 text-neutral-400">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
