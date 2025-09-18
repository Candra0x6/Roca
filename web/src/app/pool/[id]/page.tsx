"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Clock, Users, DollarSign, TrendingUp, AlertTriangle, X, Loader2, ExternalLink, Shield, RefreshCw, Zap, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatEther } from "viem"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { usePool, usePoolId, usePoolYield, useTimeSimulation, useWithdrawalInfo, useLotteryParticipants, usePoolLotteryEligibility } from "@/hooks"
import { useAccount } from "wagmi"
import { PoolState } from "@/contracts/types"

export default function PoolDetail({ params }: { params: { id: string } }) {
  const { address: account, isConnected } = useAccount()

  const {
    poolInfo: poolDetails,
    canJoin,
    canLeave,
    canWithdraw,
    refetch: refetchPool,
    joinPool: handleJoinPool,
    leavePool: handleLeavePool,
    withdrawShare: handleWithdrawShare,
    completePool: handleCompletePool,
    triggerCompletion: handleTriggerCompletion,
    isLoading: isPoolLoading,
    error: poolError,
  } = usePool(params.id as `0x${string}`)

  // Get pool ID for yield management
  const { poolId } = usePoolId(params.id as `0x${string}`)

  // Get yield data
  const {
    currentYield,
    totalValue,
    deposits,
    isLoading: isYieldLoading,
    isUpdating: isUpdatingYield,
    updateYield,
    formatYield,
    yieldPercentage,
    refetch: refetchYield
  } = usePoolYield(poolId || 0n)

  // Get withdrawal information for the current user
  const withdrawalInfo = useWithdrawalInfo(params.id as `0x${string}`, account)

  // Time simulation for development/testing
  const {
    simulateDays,
    simulateHours,
    fastEndPool,
    getBlockchainTime,
    isSimulating,
    isHardhatNetwork
  } = useTimeSimulation()

  // Lottery data for debugging
  const { participants, participantCount, isLoading: isLotteryLoading } = useLotteryParticipants(poolId)
  const { isEligible: isLotteryEligible } = usePoolLotteryEligibility(poolId)

  // Transaction states
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isTriggeringCompletion, setIsTriggeringCompletion] = useState(false)

  // Helper functions to format pool data
  const getStatusString = (state: PoolState): "Open" | "Locked" | "Active" | "Completed" => {
    switch (state) {
      case 0: return "Open"
      case 1: return "Locked"
      case 2: return "Active"
      case 3: return "Completed"
      default: return "Open"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "Open":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Locked":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")
  const [depositStatus, setDepositStatus] = useState<"idle" | "success" | "error">("idle")
  const [depositError, setDepositError] = useState<string>("")
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "success" | "error">("idle")
  const [withdrawError, setWithdrawError] = useState<string>("")

  const isLoading = isPoolLoading
  const error = poolError
  // Countdown timer - using pool duration and created time
  useEffect(() => {
    if (!poolDetails) return

    const updateCountdown = async () => {
      try {
        // Use blockchain time for accurate countdown when on hardhat network
        const now = isHardhatNetwork ? await getBlockchainTime() : new Date().getTime()
        const createdTime = Number(poolDetails.createdAt) * 1000
        const duration = Number(poolDetails.duration) * 1000
        const endTime = createdTime + duration
        const difference = endTime - now

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24))
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((difference % (1000 * 60)) / 1000)

          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeLeft("Pool ended!")
        }
      } catch (error) {
        console.error('Failed to update countdown:', error)
        // Fallback to system time if blockchain time fails
        const now = new Date().getTime()
        const createdTime = Number(poolDetails.createdAt) * 1000
        const duration = Number(poolDetails.duration) * 1000
        const endTime = createdTime + duration
        const difference = endTime - now

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24))
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((difference % (1000 * 60)) / 1000)

          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeLeft("Pool ended!")
        }
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [poolDetails, isHardhatNetwork, getBlockchainTime])

  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!poolDetails) {
      toast.error("Pool data not available")
      return
    }

    setDepositStatus("idle")
    setDepositError("")
    setIsJoining(true)

    try {
      await handleJoinPool()

      setDepositStatus("success")
      toast.success("Successfully joined the pool!")

      // Auto-close modal after success
      setTimeout(() => {
        setShowDepositModal(false)
        setDepositStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Join pool failed:", error)
      setDepositStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Transaction failed. Please try again."
      setDepositError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsJoining(false)
    }
  }

  const handleOpenDepositModal = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setShowDepositModal(true)
    setDepositStatus("idle")
    setDepositError("")
  }

  const handleLeaveGroupAction = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsLeaving(true)

    try {
      await handleLeavePool()
      toast.success("Successfully left the pool!")
      setShowLeaveModal(false)
      // Force a refetch after successful transaction
      await refetchPool()
    } catch (error) {
      console.error("Leave pool failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Transaction failed. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLeaving(false)
    }
  }
  console.log(poolDetails)

  // Debug lottery information
  useEffect(() => {
    if (poolId && poolId > 0n) {
      console.log("🎰 Lottery Debug Information:");
      console.log("Pool ID:", poolId.toString());
      console.log("Lottery Participants:", participants);
      console.log("Participant Count:", participantCount);
      console.log("Is Lottery Eligible:", isLotteryEligible);
      console.log("Is Loading Lottery:", isLotteryLoading);
    }
  }, [poolId, participants, participantCount, isLotteryEligible, isLotteryLoading])

  const handleWithdrawShareAction = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!poolDetails) {
      toast.error("Pool data not available")
      return
    }

    setWithdrawStatus("idle")
    setWithdrawError("")
    setIsWithdrawing(true)

    try {
      await handleWithdrawShare()

      setWithdrawStatus("success")
      toast.success("Successfully withdrew your share!")

      // Auto-close modal after success
      setTimeout(() => {
        setShowWithdrawModal(false)
        setWithdrawStatus("idle")
        refetchPool()
      }, 1000)
    } catch (error) {
      console.error("Withdraw share failed:", error)
      setWithdrawStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Transaction failed. Please try again."
      setWithdrawError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsWithdrawing(false)
              refetchPool()

    }
  }

  const handleOpenWithdrawModal = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setShowWithdrawModal(true)
    setWithdrawStatus("idle")
    setWithdrawError("")
  }

  const handleCompletePoolAction = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsCompleting(true)

    try {
      await handleCompletePool()
      toast.success("Pool completed successfully!")
       setTimeout(() => {
        setShowWithdrawModal(false)
        setWithdrawStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Complete pool failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to complete pool. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsCompleting(false)
              refetchPool()

    }
  }

  const handleTriggerCompletionAction = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsTriggeringCompletion(true)

    try {
      await handleTriggerCompletion()
      toast.success("Pool completion triggered successfully!")
    } catch (error) {
      console.error("Trigger completion failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to trigger completion. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsTriggeringCompletion(false)
    }
  }
  const copyTransactionHash = (txHash: string) => {
    navigator.clipboard.writeText(txHash)
    toast.success("Transaction hash copied to clipboard")
  }

  // Time simulation functions for development/testing
  const handleSimulateTime = async (days: number) => {
    if (!isHardhatNetwork) {
      toast.error("Time simulation only available on local hardhat network")
      return
    }

    try {
      await simulateDays(days)
      toast.success(`Simulated ${days} day(s) passing`)

      // Update yield after time simulation
      if (poolId && poolId > 0n) {
        await updateYield()
        await refetchYield()
      }

      // Check if pool should now be completed after time simulation
      const blockchainTime = await getBlockchainTime()
      const createdTime = Number(poolDetails?.createdAt) * 1000
      const duration = Number(poolDetails?.duration) * 1000
      const endTime = createdTime + duration

      if (blockchainTime >= endTime && poolDetails?.state !== 3) {
        toast.info("Pool duration has ended! You can now trigger completion.")
      }
    } catch (error) {
      console.error("Time simulation failed:", error)
      toast.error("Failed to simulate time passage")
    }
  }

  const handleFastEndPool = async () => {
    if (!isHardhatNetwork) {
      toast.error("Time simulation only available on local hardhat network")
      return
    }

    if (!poolDetails) {
      toast.error("Pool data not available")
      return
    }

    try {
      await fastEndPool(poolDetails.createdAt, poolDetails.duration)
      toast.success("Pool fast-forwarded to completion!")

      // Update yield after time simulation
      if (poolId && poolId > 0n) {
        await updateYield()
        await refetchYield()
      }

      toast.info("Pool data refreshed! Check if the pool now shows as ended.")
    } catch (error) {
      console.error("Fast end pool failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fast-forward pool")
    }
  }

  const handleUpdateYield = async () => {
    if (!poolId || poolId === 0n) {
      toast.error("Pool ID not available")
      return
    }

    try {
      await updateYield()
      await refetchYield()
      toast.success("Yield updated successfully")
    } catch (error) {
      console.error("Yield update failed:", error)
      toast.error("Failed to update yield")
    }
  }

  const checkSpecificContractBalance = async (contractAddress: string) => {
    try {
      console.log(`🔍 Checking balance for contract: ${contractAddress}`)

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [contractAddress, 'latest']
      })

      const balanceInEth = formatEther(BigInt(balance))
      console.log(`Contract ${contractAddress} balance:`, balanceInEth, "ETH")

      toast.info(`Contract balance: ${balanceInEth} ETH`)

      return {
        address: contractAddress,
        balance: BigInt(balance),
        balanceInEth
      }
    } catch (error) {
      console.error(`Failed to check balance for ${contractAddress}:`, error)
      toast.error(`Failed to check contract balance`)
      return null
    }
  }

  const handleCheckYieldManagerBalance = async () => {
    // The address you provided - likely the yield manager
    const yieldManagerAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
    await checkSpecificContractBalance(yieldManagerAddress)
  }

  const handleCheckPoolContractBalance = async () => {
    // Check the current pool contract balance
    await checkSpecificContractBalance(params.id)
  }

  const handleCheckAllBalances = async () => {
    console.log("🔍 Checking all relevant contract balances:")

    // Check pool contract
    console.log("1. Pool Contract:")
    await checkSpecificContractBalance(params.id)

    // Check yield manager
    console.log("2. Yield Manager:")
    const yieldManagerAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
    await checkSpecificContractBalance(yieldManagerAddress)

    // Summary
    console.log("💡 If yield manager has funds but pool doesn't, try 'Update Yield' to transfer funds back")
  }

  const debugPoolState = async () => {
    if (!poolDetails || !account) {
      console.log("❌ Missing pool details or account")
      return
    }

    console.log("🔍 Enhanced Pool Debug Information:")
    console.log("Pool State:", poolDetails.state, "(" + getStatusString(poolDetails.state) + ")")
    console.log("Is User Member:", poolDetails.isUserMember)
    console.log("User Membership:", poolDetails.userMembership)
    console.log("Total Funds:", formatEther(poolDetails.totalContributions || 0n), "ETH")
    console.log("Yield Generated:", formatEther(poolDetails.yieldGenerated || 0n), "ETH")

    if (withdrawalInfo) {
      console.log("Withdrawal Info:")
      console.log("- Principal:", formatEther(withdrawalInfo.principal), "ETH")
      console.log("- Yield Share:", formatEther(withdrawalInfo.yieldShare), "ETH")
      console.log("- Total Amount:", formatEther(withdrawalInfo.totalAmount), "ETH")
      console.log("- Has Withdrawn:", withdrawalInfo.hasWithdrawn)
      console.log("- Can Withdraw:", withdrawalInfo.canWithdraw)
    }

    // Check contract balance
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [params.id, 'latest']
      })
      const balanceInEth = formatEther(BigInt(balance))
      console.log("📊 Pool Contract Balance:", balanceInEth, "ETH")

      if (withdrawalInfo && BigInt(balance) < withdrawalInfo.totalAmount) {
        console.log("⚠️ WARNING: Contract balance insufficient for withdrawal!")
        console.log("Expected:", formatEther(withdrawalInfo.totalAmount), "ETH")
        console.log("Available:", balanceInEth, "ETH")
        console.log("Shortfall:", formatEther(withdrawalInfo.totalAmount - BigInt(balance)), "ETH")

        toast.error(`Contract balance (${balanceInEth} ETH) is less than withdrawal amount (${formatEther(withdrawalInfo.totalAmount)} ETH)`)

        console.log("💡 FIXES TO TRY:")
        console.log("1. Click 'Update Yield & Transfer Funds' to transfer funds back from yield manager")
        console.log("2. Click 'Re-trigger Pool Completion' to complete pool again")
        console.log("3. Check yield manager balance with debug tools")
      } else if (withdrawalInfo) {
        console.log("✅ Contract balance sufficient for withdrawal")
      }

    } catch (error) {
      console.error("Failed to check contract balance:", error)
    }
  }

  const handleDebugPool = async () => {
    await debugPoolState()
    toast.info("Pool debug information logged to console. Open browser dev tools to see details.")
  }

  if (isLoading) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-white/70">Loading pool details...</p>
        </div>
      </main>
    )
  }

  if (error || !poolDetails) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
          <p className="text-white/70 mb-6">
            {error?.message || "The pool you're looking for doesn't exist or has been removed."}
          </p>
          <Link href="/dashboard">
            <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  if (!isConnected) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-2xl font-bold mb-2">Wallet Not Connected</h1>
          <p className="text-white/70 mb-6">Please connect your wallet to view pool details.</p>
          <Link href="/dashboard">
            <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="pt-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <RevealOnView
            as="header"
            intensity="hero"
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 mb-6"
          >
            <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
              <DotGridShader />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <Badge
                  className={getStatusColor(getStatusString(poolDetails.state))}
                >
                  {getStatusString(poolDetails.state)}
                </Badge>
                {poolDetails.creator === account && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Shield className="h-3 w-3 mr-1" />
                    Creator
                  </Badge>
                )}
              </div>

              <AnimatedHeading
                className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-2"
                lines={[poolDetails.name || "Unnamed Pool"]}
              />

              <div className="flex flex-wrap gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatEther(poolDetails.contributionAmount)} ETH per member
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {Number(poolDetails.currentMembers)}/{Number(poolDetails.maxMembers)} Members
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.floor(Number(poolDetails.duration) / (24 * 60 * 60))} days duration
                </div>
              </div>
            </div>
          </RevealOnView>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pool Overview */}
              <RevealOnView delay={0.1}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Pool Overview</h3>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Clock className="h-4 w-4" />
                        {timeLeft}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-white/70 mb-2">
                        <span>
                          Members: {Number(poolDetails.currentMembers)} / {Number(poolDetails.maxMembers)}
                        </span>
                        <span>{Math.round((Number(poolDetails.currentMembers) / Number(poolDetails.maxMembers)) * 100)}% Full</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(Number(poolDetails.currentMembers) / Number(poolDetails.maxMembers)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="grid grid-cols-2 gap-4 text-center mb-4">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {formatEther(poolDetails.totalContributions || 0n)}
                          </p>
                          <p className="text-sm text-white/70">Total Pool (ETH)</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-400">
                            {Number(poolDetails.currentMembers)}
                          </p>
                          <p className="text-sm text-white/70">Active Members</p>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        {/* Yield Section - Only show if pool is locked/active */}
                        {(poolDetails.state === PoolState.Locked || poolDetails.state === PoolState.Active) && (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-white/70">Yield Information</h4>
                              {poolDetails.creator === account && (
                                <Button
                                  onClick={updateYield}
                                  disabled={isUpdatingYield || isYieldLoading}
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 bg-transparent text-xs px-3 py-1 h-7"
                                >
                                  {isUpdatingYield ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Update Yield
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                                  <p className="text-lg font-semibold text-cyan-400">
                                    {isYieldLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      `${formatYield(currentYield)} ETH`
                                    )}
                                  </p>
                                </div>
                                <p className="text-xs text-white/60">Yield Generated</p>
                                {yieldPercentage > 0 && (
                                  <p className="text-xs text-green-400 mt-1">
                                    +{yieldPercentage.toFixed(2)}%
                                  </p>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Zap className="h-4 w-4 text-purple-400" />
                                  <p className="text-lg font-semibold text-purple-400">
                                    {isYieldLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      `${formatYield(totalValue)} ETH`
                                    )}
                                  </p>
                                </div>
                                <p className="text-xs text-white/60">Total Value</p>
                                <p className="text-xs text-white/50 mt-1">
                                  Principal + Yield
                                </p>
                              </div>
                            </div>

                            {/* Yield Progress Bar */}
                            {deposits > 0n && (
                              <div className="mt-4">
                                <div className="flex justify-between text-xs text-white/60 mb-2">
                                  <span>Yield Progress</span>
                                  <span>
                                    {formatYield(currentYield)} / {formatYield(deposits)} ETH
                                  </span>
                                </div>
                                <div className="w-full bg-neutral-700 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (Number(formatYield(currentYield)) / Number(formatYield(deposits))) * 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Default yield section for non-active pools */}
                        {poolDetails.state !== PoolState.Locked && poolDetails.state !== PoolState.Active && (
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-lg font-semibold text-cyan-400">
                                {formatEther(poolDetails.yieldGenerated || (withdrawalInfo?.yieldShare ? withdrawalInfo.yieldShare * poolDetails.currentMembers : 0n))} ETH
                              </p>
                              <p className="text-xs text-white/60">Total Yield Earned</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center gap-1">
                                <p className="text-lg font-semibold text-purple-400">
                                  {poolDetails.state === PoolState.Completed ? "Completed" : "Pending"}
                                </p>
                                {poolDetails.state === PoolState.Completed && (
                                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                )}
                              </div>
                              <p className="text-xs text-white/60">Yield Status</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Members List */}
              <RevealOnView delay={0.2}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Pool Members</h3>
                      {poolDetails.members.length > 0 && (
                        <Button
                          onClick={() => setShowAllMembers(!showAllMembers)}
                          variant="outline"
                          size="sm"
                          className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent text-xs px-3 py-1 h-7"
                        >
                          {showAllMembers ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Show All ({poolDetails.members.length})
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(showAllMembers ? poolDetails.members : poolDetails.members.slice(0, 2)).map((member, index) => {
                        const isCreator = member.member === poolDetails.creator
                        const isCurrentUser = member.member === account
                        const joinedDate = new Date(Number(member.joinedAt) * 1000)
                        const actualIndex = showAllMembers ? index : poolDetails.members.findIndex(m => m.member === member.member)

                        return (
                          <div
                            key={member.member}
                            className={`flex items-center justify-between p-4 rounded-2xl border ${isCurrentUser
                                ? "bg-blue-500/10 border-blue-500/30"
                                : "bg-neutral-800/30 border-white/10"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isCurrentUser ? "bg-blue-500 text-white" : "bg-neutral-700 text-white/70"
                                  }`}
                              >
                                {actualIndex + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white font-mono">
                                    {member.member.slice(0, 6)}...{member.member.slice(-4)}
                                  </p>
                                  {isCreator && (
                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Creator
                                    </Badge>
                                  )}
                                  {isCurrentUser && (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-white/50">
                                  Joined: {joinedDate.toLocaleDateString()} • {formatEther(member.contributionAmount)} ETH
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <Badge
                                className={`${member.hasWithdrawn
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }`}
                              >
                                {member.hasWithdrawn ? "Withdrawn" : "Active"}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}

                      {/* Show collapsed indicator when not showing all members */}
                      {!showAllMembers && poolDetails.members.length > 2 && (
                        <div className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-white/20 bg-neutral-800/10">
                          <div className="flex items-center gap-2 text-white/50">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                              <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                              <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                            </div>
                            <span className="text-sm">and {poolDetails.members.length - 2} more members</span>
                          </div>
                        </div>
                      )}

                      {/* Empty slots - only show when showing all members or when there are few members */}
                      {(showAllMembers || poolDetails.members.length <= 2) && Array.from({ length: Number(poolDetails.maxMembers) - poolDetails.members.length }).map((_, index) => (
                        <div
                          key={`empty-${index}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-white/20 bg-neutral-800/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-sm font-semibold text-white/40">
                              {poolDetails.members.length + index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-white/40">Empty Slot</p>
                              <p className="text-sm text-white/30">Waiting for member...</p>
                            </div>
                          </div>
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                            Available
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>
                 {/* Final Pool State Display - For completed pools */}
              {poolDetails.state === PoolState.Completed && (
                <RevealOnView delay={0.45}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Pool Summary</h3>

                      <div className="space-y-4">
                        <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-white/70">Total Members:</span>
                              <span className="text-white font-medium">{Number(poolDetails.currentMembers)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70">Total Principal:</span>
                              <span className="text-white font-medium">{formatEther(poolDetails.totalContributions)} ETH</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70">Total Yield Generated:</span>
                              <span className="text-cyan-400 font-medium">{formatEther(poolDetails.yieldGenerated || (withdrawalInfo?.yieldShare ? withdrawalInfo.yieldShare * poolDetails.currentMembers : 0n))} ETH</span>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                              <div className="flex justify-between items-center">
                                <span className="text-white font-medium">Final Pool Value:</span>
                                <span className="text-green-400 font-bold text-lg">
                                  {formatEther(poolDetails.totalContributions + (withdrawalInfo?.yieldShare ? withdrawalInfo.yieldShare * poolDetails.currentMembers : 0n))} ETH
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Member Withdrawal Status */}
                        <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                          <h4 className="text-sm font-medium text-white mb-3">Withdrawal Status</h4>
                          <div className="space-y-2">
                            {poolDetails.members.map((member, index) => (
                              <div key={member.member} className="flex items-center justify-between text-sm">
                                <span className="text-white/70 font-mono">
                                  {member.member === account ? "You" : `Member ${index + 1}`}
                                </span>
                                <Badge
                                  className={`text-xs ${member.hasWithdrawn
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    }`}
                                >
                                  {member.hasWithdrawn ? "Withdrawn" : "Pending"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )}

              {/* Lottery Integration Component */}
              {/* Display lottery integration - MVP  */}
              {/* {poolId && poolId > 0n && (
                <RevealOnView delay={0.5}>
                  <LotteryIntegration
                    poolAddress={params.id as `0x${string}`}
                    poolId={poolId}
                    poolMembers={Number(poolDetails.maxMembers)}
                    poolName={poolDetails.name}
                    isAdmin={account === poolDetails.creator} // For demo, creator has admin rights
                    isCreator={account === poolDetails.creator}
                    currentYield={currentYield}
                    totalContributions={poolDetails.totalContributions}
                  />
                </RevealOnView>
              )} */}
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Pool Information */}
              <RevealOnView delay={0.3}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-white mb-4">Pool Information</h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-white/10">
                        <span className="text-white/70">Created</span>
                        <span className="text-white font-medium">
                          {new Date(Number(poolDetails.createdAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-white/10">
                        <span className="text-white/70">Duration</span>
                        <span className="text-white font-medium">
                          {Math.floor(Number(poolDetails.duration) / (24 * 60 * 60))} days
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-white/10">
                        <span className="text-white/70">Creator</span>
                        <span className="text-white font-medium font-mono text-sm">
                          {poolDetails.creator.slice(0, 6)}...{poolDetails.creator.slice(-4)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-white/70">Status</span>
                        <Badge className={getStatusColor(getStatusString(poolDetails.state))}>
                          {getStatusString(poolDetails.state)}
                        </Badge>
                      </div>
                      <div className="text-center p-4 bg-neutral-800/30 rounded-2xl border border-white/10">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                        <p className="text-white/70">
                          {poolDetails.state === 3
                            ? "This pool has been completed"
                            : Number(poolDetails.currentMembers) >= Number(poolDetails.maxMembers)
                              ? "Pool is full"
                              : poolDetails.state === 1 && "Pool is locked and generating yield"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Contract Balance Debugging - Development Tools
              {isHardhatNetwork && (
                <RevealOnView delay={0.32}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Contract Balance Debugging</h3>
                      
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-blue-400 text-sm mb-3">
                          <TrendingUp className="h-4 w-4" />
                          Balance Investigation Tools
                        </div>
                        <p className="text-white/70 text-xs mb-3">
                          Check where the funds are currently held in the system
                        </p>
                        
                        <div className="space-y-2">
                          <Button
                            onClick={handleCheckPoolContractBalance}
                            variant="outline"
                            size="sm"
                            className="w-full rounded-full border-blue-500 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            Check Pool Contract Balance
                          </Button>
                          
                          <Button
                            onClick={handleCheckYieldManagerBalance}
                            variant="outline"
                            size="sm"
                            className="w-full rounded-full border-cyan-500 text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                          >
                            Check Yield Manager Balance
                          </Button>
                          
                          <Button
                            onClick={handleCheckAllBalances}
                            variant="outline"
                            size="sm"
                            className="w-full rounded-full border-purple-500 text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950"
                          >
                            Check All Contract Balances
                          </Button>
                          
                          <Button
                            onClick={handleDebugPool}
                            variant="outline"
                            size="sm"
                            className="w-full rounded-full border-orange-500 text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
                          >
                            🔍 Debug Pool State
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-white/50 space-y-1">
                        <p>• Pool Contract: {params.id}</p>
                        <p>• Yield Manager: 0xe451980132e65465d0a498c53f0b5227326dd73f</p>
                        <p className="pt-2 text-yellow-400">💡 If yield manager has funds but pool doesn&lsquo;t, update yield to transfer funds back</p>
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )} */}

              {/* Yield Management - Creator Only */}
              

              {/* Pool Completion Controls - For Active pools that can be completed */}
              {poolDetails.state === PoolState.Active && poolDetails.creator === account && (
                <RevealOnView delay={0.35}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Pool Management</h3>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <Shield className="h-3 w-3 mr-1" />
                          Creator
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                            <Clock className="h-4 w-4" />
                            Pool Countdown
                          </div>
                          <p className="text-white font-medium text-lg">{timeLeft}</p>
                          <p className="text-white/50 text-xs mt-1">
                            Pool will auto-complete when duration expires
                          </p>
                        </div>

                        <Button
                          onClick={handleCompletePoolAction}
                          disabled={isCompleting}
                          className="w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                        >
                          {isCompleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Completing Pool...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Complete Pool Now
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-white/50 text-center">
                          This will finalize the pool and enable member withdrawals
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )}



              {/* Withdrawal Actions - For completed pools where user is a member */}
              {poolDetails.state === PoolState.Completed && poolDetails.isUserMember && (
                <RevealOnView delay={0.4}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Withdraw Your Share</h3>

                      <div className="space-y-4">
                        {/* Withdrawal Information */}
                        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                            <DollarSign className="h-4 w-4" />
                            Pool Completed Successfully
                          </div>

                          {withdrawalInfo && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-white/70">Your Principal:</span>
                                <span className="text-white font-medium">
                                  {formatEther(withdrawalInfo.principal)} ETH
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Your Yield Share:</span>
                                <span className="text-cyan-400 font-medium">
                                  {formatEther(withdrawalInfo.yieldShare)} ETH
                                </span>
                              </div>
                              <div className="pt-2 border-t border-green-500/30">
                                <div className="flex justify-between">
                                  <span className="text-white font-medium">Total Withdrawal:</span>
                                  <span className="text-green-400 font-bold text-lg">
                                    {formatEther(withdrawalInfo.totalAmount)} ETH
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {poolDetails.members.find(member => member.member === account)?.hasWithdrawn ? (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm mb-2">
                              <Shield className="h-4 w-4" />
                              Withdrawal Complete
                            </div>
                            <p className="text-white/70 text-sm">
                              You have already withdrawn your share from this pool.
                            </p>
                          </div>
                        ) : (
                          <Button
                            onClick={handleOpenWithdrawModal}
                            disabled={isWithdrawing}
                            className="w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                          >
                            {isWithdrawing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Withdraw Your Share
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )}

           
              {/* Actions for members */}
              {poolDetails.isUserMember && poolDetails.state !== PoolState.Completed && (
                <RevealOnView delay={0.4}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Member Actions</h3>

                      <div className="space-y-3">
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                            <Users className="h-4 w-4" />
                            You are a member of this pool
                          </div>
                          <p className="text-white/70 text-xs">
                            Contributed: {formatEther(poolDetails.members.find(member => member.member === account)?.contributionAmount || 0n)} ETH
                          </p>
                        </div>

                        {/* Yield Information for Member */}
                        {(poolDetails.state === PoolState.Locked || poolDetails.state === PoolState.Active) && (
                          <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                            <h4 className="text-sm font-medium text-white mb-3">Your Yield Share</h4>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-white/70 text-sm">Total Pool Yield:</span>
                                <span className="text-cyan-400 font-medium">
                                  {isYieldLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    `${formatYield(currentYield)} ETH`
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-white/70 text-sm">Your Share:</span>
                                <span className="text-purple-400 font-medium">
                                  {isYieldLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    poolDetails.currentMembers > 0n ?
                                      `${formatYield(currentYield / poolDetails.currentMembers)} ETH` :
                                      '0 ETH'
                                  )}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Expected Total:</span>
                                  <span className="text-green-400 font-medium">
                                    {isYieldLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      poolDetails.currentMembers > 0n ?
                                        `${formatEther((poolDetails.members.find(member => member.member === account)?.contributionAmount || 0n) + (currentYield / poolDetails.currentMembers))} ETH` :
                                        formatEther(poolDetails.members.find(member => member.member === account)?.contributionAmount || 0n) + ' ETH'
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-white/50 mt-1">Principal + Your Yield Share</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {canLeave && (
                          <Button
                            onClick={() => setShowLeaveModal(true)}
                            variant="outline"
                            className="w-full rounded-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Leave Pool
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )}

              {/* Actions for non-members */}
              {!poolDetails.isUserMember && canJoin && (
                <RevealOnView delay={0.4}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Join Pool</h3>

                      <div className="mb-4 p-4 bg-neutral-800/30 rounded-2xl border border-white/10">
                        <div className="text-center">
                          <p className="text-sm text-white/70 mb-1">Contribution Required</p>
                          <p className="text-xl font-bold text-white">
                            {formatEther(poolDetails.contributionAmount)} ETH
                          </p>
                          <p className="text-xs text-white/50 mt-1">
                            {Number(poolDetails.currentMembers)}/{Number(poolDetails.maxMembers)} members
                          </p>
                        </div>

                        {/* Show yield expectations if pool is generating yield */}
                        {(poolDetails.state === PoolState.Locked || poolDetails.state === PoolState.Active) && currentYield > 0n && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-center">
                              <p className="text-sm text-cyan-400 font-medium">
                                Current Pool Yield: {formatYield(currentYield)} ETH
                              </p>
                              <p className="text-xs text-white/60 mt-1">
                                Your potential share: ~{poolDetails.maxMembers > 0n ? formatYield(currentYield / poolDetails.maxMembers) : '0'} ETH
                              </p>
                              {yieldPercentage > 0 && (
                                <p className="text-xs text-green-400 mt-1">
                                  +{yieldPercentage.toFixed(2)}% yield rate
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleOpenDepositModal}
                        className="w-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                        disabled={!canJoin || poolDetails.state !== PoolState.Open}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Join Pool
                      </Button>
                    </div>
                  </div>
                </RevealOnView>
              )}


              {/* Pool full or closed message */}

            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Join Pool</h3>
              <Button
                onClick={() => setShowDepositModal(false)}
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                disabled={isJoining}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Required Amount Display */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="text-center">
                <p className="text-sm text-white/70 mb-1">Required Contribution</p>
                <p className="text-2xl font-bold text-white">
                  {formatEther(poolDetails.contributionAmount)} ETH
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Pool: {poolDetails.name}
                </p>
              </div>
            </div>

            {/* Pool Information */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Members:</span>
                  <span className="text-white">
                    {Number(poolDetails.currentMembers)}/{Number(poolDetails.maxMembers)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Pool Status:</span>
                  <Badge className={getStatusColor(getStatusString(poolDetails.state))}>
                    {getStatusString(poolDetails.state)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Duration:</span>
                  <span className="text-white">
                    {Math.floor(Number(poolDetails.duration) / (24 * 60 * 60))} days
                  </span>
                </div>

              </div>
            </div>

            {/* Status Messages */}
            {isJoining && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing transaction...
                </div>
              </div>
            )}

            {depositStatus === "success" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Successfully joined the pool!
                </div>
              </div>
            )}

            {depositStatus === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                <div className="text-red-400 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Transaction Failed
                  </div>
                  <p className="text-xs text-red-400/80">{depositError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleDeposit}
                disabled={
                  isJoining ||
                  poolDetails.state !== PoolState.Open ||
                  depositStatus === "success"
                }
                className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : depositStatus === "success" ? (
                  "Success!"
                ) : (
                  "Join Pool"
                )}
              </Button>
              <Button
                onClick={() => setShowDepositModal(false)}
                variant="outline"
                className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                disabled={isJoining}
              >
                Cancel
              </Button>
            </div>

            {/* Transaction Info */}
            <p className="text-xs text-white/50 text-center mt-4">
              This will trigger a wallet transaction. Make sure you have enough ETH for gas fees.
            </p>
          </div>
        </div>
      )}

      {/* Leave Pool Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Leave Pool</h3>

            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="text-sm text-white/70 mb-2">Pool Information:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Name:</span>
                  <span className="text-white">{poolDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Your Contribution:</span>
                  <span className="text-white">
                    {formatEther(poolDetails.userMembership?.contributionAmount || 0n)} ETH
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Status:</span>
                  <Badge className={getStatusColor(getStatusString(poolDetails.state))}>
                    {getStatusString(poolDetails.state)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-400 text-sm">
                  <p className="font-medium mb-1">Warning</p>
                  <p className="text-red-400/80">
                    Leaving this pool is permanent and may affect other members.
                    You may lose your contribution depending on the pool state.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleLeaveGroupAction}
                disabled={isLeaving}
                variant="outline"
                className="flex-1 rounded-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  "Leave Pool"
                )}
              </Button>
              <Button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                disabled={isLeaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Share Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Withdraw Your Share</h3>
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                disabled={isWithdrawing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Withdrawal Summary */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="text-center">
                <p className="text-sm text-white/70 mb-1">Pool Completed Successfully</p>
                <div className="space-y-2 mt-3">
                  {withdrawalInfo && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Your Principal:</span>
                        <span className="text-white font-medium">
                          {formatEther(withdrawalInfo.principal)} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Your Yield Share:</span>
                        <span className="text-cyan-400 font-medium">
                          {formatEther(withdrawalInfo.yieldShare)} ETH
                        </span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-white font-medium">Total Withdrawal:</span>
                          <span className="text-green-400 font-bold text-xl">
                            {formatEther(withdrawalInfo.totalAmount)} ETH
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pool Information */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Pool Name:</span>
                  <span className="text-white">{poolDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Pool Status:</span>
                  <Badge className={getStatusColor(getStatusString(poolDetails.state))}>
                    {getStatusString(poolDetails.state)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Total Pool Value:</span>
     <span className="text-white">
                    {formatEther(poolDetails.totalContributions + currentYield)} ETH
                  </span>                </div>
              </div>
            </div>

            {/* Status Messages */}
            {isWithdrawing && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing withdrawal transaction...
                </div>
              </div>
            )}

            {withdrawStatus === "success" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Successfully withdrew your share!
                </div>
              </div>
            )}

            {withdrawStatus === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                <div className="text-red-400 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Withdrawal Failed
                  </div>
                  <p className="text-xs text-red-400/80">{withdrawError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleWithdrawShareAction}
                disabled={
                  isWithdrawing ||
                  poolDetails.state !== PoolState.Completed ||
                  withdrawStatus === "success" ||
                  poolDetails.members.find(member => member.member === account)?.hasWithdrawn
                }
                className="flex-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : withdrawStatus === "success" ? (
                  "Success!"
                ) : poolDetails.members.find(member => member.member === account)?.hasWithdrawn ? (
                  "Already Withdrawn"
                ) : (
                  "Withdraw Share"
                )}
              </Button>
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="outline"
                className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                disabled={isWithdrawing}
              >
                Cancel
              </Button>
            </div>

            {/* Transaction Info */}
            <p className="text-xs text-white/50 text-center mt-4">
              This will trigger a wallet transaction to withdraw your principal + yield share.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
