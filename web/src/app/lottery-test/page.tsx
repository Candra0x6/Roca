/**
 * @title Lottery Test Page
 * @dev Demonstration page showing lottery integration functionality
 * 
 * This page demonstrates the lottery integration test flow in the frontend:
 * - Shows lottery configuration and status
 * - Displays pool lottery eligibility
 * - Provides lottery management controls
 * - Shows global lottery statistics
 * 
 * Based on the comprehensive lottery integration test
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  Trophy, 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Target,
  Gift,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Crown,
  Settings
} from "lucide-react"

import { useLotteryIntegration } from "@/hooks"
import { useAccount } from "wagmi"

export default function LotteryTestPage() {
  const { address: account, isConnected } = useAccount()
  
  // Test with a sample pool - in real usage this would come from pool data
  const testPoolAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`
  const testPoolId = 1n
  
  const {
    // Configuration
    lotteryConfig,
    
    // Pool status
    poolLotteryStatus,
    getPoolLotteryStatus,
    
    // Statistics
    globalStats,
    getGlobalLotteryStats,
    
    // Loading states
    isLoading,
    
    // Error handling
    error,
    clearError,
    
    // Utilities
    refetchAll,
    formatPrizeAmount,
    formatDuration,
  } = useLotteryIntegration(testPoolAddress, testPoolId)

  // Component state
  const [participantCount, setParticipantCount] = useState(0)
  const [isEligible, setIsEligible] = useState(false)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        await getGlobalLotteryStats()
        await getPoolLotteryStatus(testPoolId)
      } catch (err) {
        console.error('Failed to load lottery test data:', err)
      }
    }

    loadData()
  }, [getGlobalLotteryStats, getPoolLotteryStatus, testPoolId])

  // Simulate test data when lottery config is available
  useEffect(() => {
    if (lotteryConfig) {
      // Simulate some test participants for demonstration
      setParticipantCount(5)
      setIsEligible(true)
    }
  }, [lotteryConfig])

  const handleRefresh = async () => {
    try {
      await refetchAll()
      toast.success("Lottery test data refreshed")
    } catch (err) {
      toast.error("Failed to refresh data")
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <Card className="bg-neutral-900/50 border-neutral-800 max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Lottery Integration Test
            </CardTitle>
            <CardDescription>
              Connect your wallet to test lottery functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-neutral-400 mb-4">
              This page demonstrates the lottery integration functionality
              similar to the lottery integration test flow.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Lottery Integration Test
          </h1>
          <p className="text-neutral-400 text-lg">
            Demonstration of lottery system functionality from the integration test
          </p>
        </div>

        {/* Configuration Overview */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-white">Lottery Configuration</CardTitle>
              </div>
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
            <CardDescription className="text-neutral-400">
              Current lottery system configuration and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lotteryConfig ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                    <Clock className="w-4 h-4" />
                    Draw Interval
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatDuration(lotteryConfig.drawInterval)}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Prize Percentage
                  </div>
                  <div className="text-xl font-bold text-white">
                    {(Number(lotteryConfig.prizePercentage) / 100).toFixed(1)}%
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                    <Users className="w-4 h-4" />
                    Min Pool Size
                  </div>
                  <div className="text-xl font-bold text-white">
                    {lotteryConfig.minPoolSize.toString()}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                    <Gift className="w-4 h-4" />
                    Max Prize
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatPrizeAmount(lotteryConfig.maxPrizeAmount)} ETH
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-400">Loading lottery configuration...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Pool Status */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Test Pool Lottery Status
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Simulated pool data demonstrating lottery integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Users className="w-4 h-4" />
                  Participants
                </div>
                <div className="text-2xl font-bold text-white">{participantCount}</div>
                <div className="text-sm text-neutral-400 mt-1">
                  Registered in lottery
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Crown className="w-4 h-4" />
                  Eligibility Status
                </div>
                <div className="flex items-center gap-2">
                  {isEligible ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-400 font-semibold">Eligible</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-400 font-semibold">Not Eligible</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  Meets lottery requirements
                </div>
              </div>
              
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <Gift className="w-4 h-4" />
                  Estimated Prize
                </div>
                <div className="text-2xl font-bold text-white">0.2 ETH</div>
                <div className="text-sm text-neutral-400 mt-1">
                  Based on 10% of 2 ETH yield
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Statistics */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Global Lottery Statistics
            </CardTitle>
            <CardDescription className="text-neutral-400">
              System-wide lottery statistics and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {globalStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="text-sm text-neutral-400 mb-1">Total Draws</div>
                  <div className="text-2xl font-bold text-white">
                    {globalStats.totalDraws.toString()}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="text-sm text-neutral-400 mb-1">Total Prizes</div>
                  <div className="text-2xl font-bold text-white">
                    {formatPrizeAmount(globalStats.totalPrizesDistributed)} ETH
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="text-sm text-neutral-400 mb-1">Participants</div>
                  <div className="text-2xl font-bold text-white">
                    {globalStats.totalParticipants.toString()}
                  </div>
                </div>
                
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="text-sm text-neutral-400 mb-1">Avg Prize</div>
                  <div className="text-2xl font-bold text-white">
                    {formatPrizeAmount(globalStats.averagePrizeAmount)} ETH
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-neutral-800/50 rounded-lg p-4">
                    <div className="text-sm text-neutral-400 mb-1">Loading...</div>
                    <div className="text-2xl font-bold text-white">--</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Information */}
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Test Flow Information
            </CardTitle>
            <CardDescription className="text-blue-300">
              This demonstrates the lottery integration test functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="bg-blue-800/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Complete User Flow:</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-200">
                  <li>Users join pool → Not yet lottery eligible</li>
                  <li>Pool locks → Automatic lottery participant registration</li>
                  <li>Pool active + yield generation → Automatic lottery draw requests</li>
                  <li>Weekly lottery draws → Winner selection and prize distribution</li>
                  <li>Pool completion → Lottery history preserved</li>
                </ol>
              </div>
              
              <div className="bg-blue-800/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Integration Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-200">
                  <li>Automatic participant registration on pool lock</li>
                  <li>Smart prize calculation based on yield percentage</li>
                  <li>Badge minting for lottery winners</li>
                  <li>Comprehensive statistics tracking</li>
                  <li>Admin controls for configuration management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Error
              </div>
              <div className="text-red-300 text-sm mb-4">{error.message}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="border-red-500/30 text-red-400 hover:bg-red-900/30"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
