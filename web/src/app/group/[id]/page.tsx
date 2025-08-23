"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Clock, Users, DollarSign, TrendingUp, AlertTriangle, X, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface GroupMember {
  address: string
  alias: string
  contributionStatus: "Paid" | "Unpaid" | "Received Payout"
  isCurrentReceiver: boolean
  joinedRound: number
}

interface Transaction {
  id: string
  type: "contribution" | "payout"
  round: number
  from: string
  to?: string
  amount: string
  token: string
  timestamp: string
  txHash: string
}

interface GroupData {
  id: string
  name: string
  contributionAmount: string
  token: string
  frequency: string
  maxMembers: number
  currentRound: number
  totalRounds: number
  nextPayoutDate: string
  status: "Active" | "Completed" | "Pending"
  members: GroupMember[]
  transactions: Transaction[]
  userIsMember: boolean
  canLeave: boolean
  payoutMode: "fifo" | "random" | "voting"
  nextPayoutMember?: string
  shuffleInProgress?: boolean
  votingActive?: boolean
  votingEndTime?: string
  userVote?: string
  votes?: { [memberAddress: string]: number }
  yieldEarned?: string
  apySource?: string
}

export default function GroupDetail({ params }: { params: { id: string } }) {
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")
  const [userBalance, setUserBalance] = useState<string>("0")
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)
  const [depositStatus, setDepositStatus] = useState<"idle" | "success" | "error">("idle")
  const [depositError, setDepositError] = useState<string>("")
  const [showShuffleModal, setShowShuffleModal] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleResult, setShuffleResult] = useState<string | null>(null)
  const [showVotingModal, setShowVotingModal] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [selectedVote, setSelectedVote] = useState<string>("")

  useEffect(() => {
    // Simulate fetching group data from smart contract
    console.log("[v0] Fetching group data for ID:", params.id)

    setTimeout(() => {
      const mockGroupData: GroupData = {
        id: params.id,
        name: "Alpha Savers Circle",
        contributionAmount: "0.1",
        token: "ETH",
        frequency: "Weekly",
        maxMembers: 6,
        currentRound: 3,
        totalRounds: 6,
        nextPayoutDate: "2024-01-15T10:00:00Z",
        status: "Active",
        userIsMember: true,
        canLeave: true,
        payoutMode: "voting", // Can be "fifo", "random", or "voting"
        nextPayoutMember: "Alice", // For FIFO mode
        shuffleInProgress: false,
        votingActive: false,
        votingEndTime: "2024-01-14T10:00:00Z",
        userVote: undefined,
        votes: {
          "0x8ba1f109551bD432803012645Hac136c30C6213": 2,
          "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db": 1,
          "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB": 3,
        },
        members: [
          {
            address: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
            alias: "You",
            contributionStatus: "Paid",
            isCurrentReceiver: false,
            joinedRound: 1,
          },
          {
            address: "0x8ba1f109551bD432803012645Hac136c30C6213",
            alias: "Alice",
            contributionStatus: "Paid",
            isCurrentReceiver: true,
            joinedRound: 1,
          },
          {
            address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            alias: "Bob",
            contributionStatus: "Unpaid",
            isCurrentReceiver: false,
            joinedRound: 2,
          },
          {
            address: "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",
            alias: "Carol",
            contributionStatus: "Paid",
            isCurrentReceiver: false,
            joinedRound: 1,
          },
          {
            address: "0x617F2E2fD72FD9D5503197092aC168c91465E7f2",
            alias: "Dave",
            contributionStatus: "Paid",
            isCurrentReceiver: false,
            joinedRound: 2,
          },
          {
            address: "0x17F6AD8Ef982297579C203069C1DbfFE4348c372",
            alias: "Eve",
            contributionStatus: "Paid",
            isCurrentReceiver: false,
            joinedRound: 1,
          },
        ],
        transactions: [
          {
            id: "1",
            type: "payout",
            round: 2,
            from: "Pool",
            to: "0x8ba1f109551bD432803012645Hac136c30C6213",
            amount: "0.6",
            token: "ETH",
            timestamp: "2024-01-08T10:00:00Z",
            txHash: "0xabc123...",
          },
          {
            id: "2",
            type: "contribution",
            round: 3,
            from: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
            amount: "0.1",
            token: "ETH",
            timestamp: "2024-01-08T09:30:00Z",
            txHash: "0xdef456...",
          },
          {
            id: "3",
            type: "contribution",
            round: 3,
            from: "0x8ba1f109551bD432803012645Hac136c30C6213",
            amount: "0.1",
            token: "ETH",
            timestamp: "2024-01-08T09:25:00Z",
            txHash: "0xghi789...",
          },
        ],
        yieldEarned: "0.45",
        apySource: "Marinade",
      }
      setGroupData(mockGroupData)
      setIsLoading(false)
    }, 1000)
  }, [params.id])

  // Countdown timer
  useEffect(() => {
    if (!groupData) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const payoutTime = new Date(groupData.nextPayoutDate).getTime()
      const difference = payoutTime - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft("Payout due!")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [groupData])

  const handleDeposit = async () => {
    setIsDepositing(true)
    setDepositStatus("idle")
    setDepositError("")
    console.log("[v0] Processing deposit contribution...")

    try {
      // Check user balance first
      setIsCheckingBalance(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const requiredAmount = Number.parseFloat(groupData!.contributionAmount)
      const currentBalance = Number.parseFloat(userBalance)

      if (currentBalance < requiredAmount) {
        throw new Error(
          `Insufficient balance. You need ${requiredAmount} ${groupData!.token} but only have ${currentBalance} ${groupData!.token}`,
        )
      }

      setIsCheckingBalance(false)

      // Simulate wallet transaction
      await new Promise((resolve) => setTimeout(resolve, 3000))
      console.log("[v0] Deposit successful")
      setDepositStatus("success")

      // Auto-close modal after success
      setTimeout(() => {
        setShowDepositModal(false)
        setDepositStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Deposit failed:", error)
      setDepositStatus("error")
      setDepositError(error instanceof Error ? error.message : "Transaction failed. Please try again.")
    } finally {
      setIsDepositing(false)
      setIsCheckingBalance(false)
    }
  }

  const handleOpenDepositModal = async () => {
    setShowDepositModal(true)
    setDepositStatus("idle")
    setDepositError("")

    // Simulate fetching user balance
    console.log("[v0] Fetching user balance...")
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      // Mock balance - in real app, this would come from wallet/blockchain
      setUserBalance("0.25") // Sufficient balance for demo
    } catch (error) {
      console.error("[v0] Failed to fetch balance:", error)
      setUserBalance("0")
    }
  }

  const handleLeaveGroup = async () => {
    setIsLeaving(true)
    console.log("[v0] Processing leave group...")

    try {
      // Simulate smart contract call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("[v0] Left group successfully")
      // Redirect to dashboard
    } catch (error) {
      console.error("[v0] Leave group failed:", error)
    } finally {
      setIsLeaving(false)
    }
  }

  const copyTransactionHash = (txHash: string) => {
    navigator.clipboard.writeText(txHash)
    console.log("[v0] Transaction hash copied:", txHash)
  }

  const handleRunShuffle = async () => {
    setIsShuffling(true)
    setShuffleResult(null)
    console.log("[v0] Running random shuffle...")

    try {
      // Simulate smart contract shuffle call
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Simulate random selection (excluding current receiver and those who already received)
      const eligibleMembers = groupData!.members.filter(
        (m) => !m.isCurrentReceiver && m.contributionStatus !== "Received Payout",
      )
      const randomIndex = Math.floor(Math.random() * eligibleMembers.length)
      const selectedMember = eligibleMembers[randomIndex]

      setShuffleResult(selectedMember.alias)
      console.log("[v0] Shuffle complete, selected:", selectedMember.alias)
    } catch (error) {
      console.error("[v0] Shuffle failed:", error)
    } finally {
      setIsShuffling(false)
    }
  }

  const handleVote = async () => {
    if (!selectedVote) return

    setIsVoting(true)
    console.log("[v0] Submitting vote for:", selectedVote)

    try {
      // Simulate smart contract vote call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("[v0] Vote submitted successfully")
      setShowVotingModal(false)
      setSelectedVote("")
    } catch (error) {
      console.error("[v0] Vote failed:", error)
    } finally {
      setIsVoting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-white/70">Loading group details...</p>
        </div>
      </main>
    )
  }

  if (!groupData) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Group Not Found</h1>
          <p className="text-white/70 mb-6">The group you're looking for doesn't exist or has been removed.</p>
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
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <Badge
                  variant={
                    groupData.status === "Active"
                      ? "default"
                      : groupData.status === "Completed"
                        ? "secondary"
                        : "outline"
                  }
                  className={`${
                    groupData.status === "Active"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : groupData.status === "Completed"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}
                >
                  {groupData.status}
                </Badge>
              </div>

              <AnimatedHeading
                className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-2"
                lines={[groupData.name]}
              />

              <div className="flex flex-wrap gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {groupData.contributionAmount} {groupData.token} • {groupData.frequency}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {groupData.members.length}/{groupData.maxMembers} Members
                </div>
              </div>
            </div>
          </RevealOnView>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Round Progress */}
              <RevealOnView delay={0.1}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Current Round Progress</h3>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Clock className="h-4 w-4" />
                        {timeLeft}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-white/70 mb-2">
                        <span>
                          Round {groupData.currentRound} of {groupData.totalRounds}
                        </span>
                        <span>{Math.round((groupData.currentRound / groupData.totalRounds) * 100)}% Complete</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(groupData.currentRound / groupData.totalRounds) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="grid grid-cols-2 gap-4 text-center mb-4">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {(Number.parseFloat(groupData.contributionAmount) * groupData.members.length).toFixed(2)}
                          </p>
                          <p className="text-sm text-white/70">Total Pool ({groupData.token})</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-400">
                            {groupData.members.filter((m) => m.contributionStatus === "Paid").length}
                          </p>
                          <p className="text-sm text-white/70">Members Paid</p>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold text-cyan-400">
                              {groupData.yieldEarned || "0.45"} {groupData.token}
                            </p>
                            <p className="text-xs text-white/60">Current Yield Earned</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-center gap-1">
                              <p className="text-lg font-semibold text-purple-400">
                                {groupData.apySource || "Marinade"}
                              </p>
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            </div>
                            <p className="text-xs text-white/60">APY Source</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Payout Selection */}
              <RevealOnView delay={0.15}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-white mb-4">Payout Selection</h3>

                    {/* FIFO Mode */}
                    {groupData.payoutMode === "fifo" && (
                      <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-white">First In, First Out (FIFO)</p>
                            <p className="text-sm text-white/70">Automatic selection based on join order</p>
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mt-3">
                          <p className="text-blue-400 text-sm">
                            <span className="font-medium">Next payout:</span> {groupData.nextPayoutMember} (joined
                            earliest)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Random Shuffle Mode */}
                    {groupData.payoutMode === "random" && (
                      <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                              <TrendingUp className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-white">Random Shuffle</p>
                              <p className="text-sm text-white/70">Fair random selection via smart contract</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowShuffleModal(true)}
                            disabled={groupData.shuffleInProgress || groupData.status !== "Active"}
                            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            Run Shuffle
                          </Button>
                        </div>

                        {shuffleResult && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mt-3">
                            <p className="text-green-400 text-sm">
                              <span className="font-medium">Selected:</span> {shuffleResult} 🎉
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voting Mode */}
                    {groupData.payoutMode === "voting" && (
                      <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                              <Users className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-white">Community Voting</p>
                              <p className="text-sm text-white/70">Members vote for payout recipient</p>
                            </div>
                          </div>
                          {groupData.votingActive && !groupData.userVote && (
                            <Button
                              onClick={() => setShowVotingModal(true)}
                              className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            >
                              Vote for Payout
                            </Button>
                          )}
                        </div>

                        {groupData.votingActive && (
                          <div className="space-y-3 mt-3">
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                              <p className="text-orange-400 text-sm mb-2">
                                <span className="font-medium">Voting ends:</span>{" "}
                                {new Date(groupData.votingEndTime!).toLocaleString()}
                              </p>
                              {groupData.userVote && (
                                <p className="text-green-400 text-xs">✓ You voted for: {groupData.userVote}</p>
                              )}
                            </div>

                            {/* Vote Results */}
                            <div className="space-y-2">
                              <p className="text-sm text-white/70 font-medium">Current Votes:</p>
                              {Object.entries(groupData.votes || {}).map(([address, voteCount]) => {
                                const member = groupData.members.find((m) => m.address === address)
                                return (
                                  <div key={address} className="flex items-center justify-between text-sm">
                                    <span className="text-white">{member?.alias || "Unknown"}</span>
                                    <span className="text-white/70">{voteCount} votes</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                    <h3 className="text-lg font-semibold text-white mb-4">Members</h3>

                    <div className="space-y-3">
                      {groupData.members.map((member, index) => (
                        <div
                          key={member.address}
                          className={`flex items-center justify-between p-4 rounded-2xl border ${
                            member.isCurrentReceiver
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "bg-neutral-800/30 border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                                member.isCurrentReceiver ? "bg-blue-500 text-white" : "bg-neutral-700 text-white/70"
                              }`}
                            >
                              {member.alias.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {member.alias}
                                {member.isCurrentReceiver && (
                                  <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    Current Receiver
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-white/50 font-mono">
                                {member.address.slice(0, 6)}...{member.address.slice(-4)}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant={
                              member.contributionStatus === "Paid"
                                ? "default"
                                : member.contributionStatus === "Received Payout"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={`${
                              member.contributionStatus === "Paid"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : member.contributionStatus === "Received Payout"
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                            }`}
                          >
                            {member.contributionStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Transaction History */}
              <RevealOnView delay={0.3}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>

                    <div className="space-y-3">
                      {groupData.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 bg-neutral-800/30 rounded-2xl border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === "payout" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {tx.type === "payout" ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <DollarSign className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {tx.type === "payout" ? "Payout" : "Contribution"} - Round {tx.round}
                              </p>
                              <p className="text-sm text-white/50">
                                {new Date(tx.timestamp).toLocaleDateString()} • {tx.amount} {tx.token}
                              </p>
                            </div>
                          </div>

                          <Button
                            onClick={() => copyTransactionHash(tx.txHash)}
                            variant="ghost"
                            size="sm"
                            className="text-white/50 hover:text-white hover:bg-white/10"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {groupData.userIsMember && (
                <RevealOnView delay={0.4}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>

                      <div className="space-y-3">
                        <Button
                          onClick={handleOpenDepositModal}
                          className="w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                          disabled={groupData.status !== "Active"}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Deposit Contribution
                        </Button>

                        {groupData.canLeave && (
                          <Button
                            onClick={() => setShowLeaveModal(true)}
                            variant="outline"
                            className="w-full rounded-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Leave Group
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </RevealOnView>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Deposit Contribution</h3>
              <Button
                onClick={() => setShowDepositModal(false)}
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                disabled={isDepositing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Required Amount Display */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="text-center">
                <p className="text-sm text-white/70 mb-1">Required Contribution</p>
                <p className="text-2xl font-bold text-white">
                  {groupData.contributionAmount} {groupData.token}
                </p>
                <p className="text-xs text-white/50 mt-1">Round {groupData.currentRound}</p>
              </div>
            </div>

            {/* Balance Check */}
            <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Your Balance:</span>
                <span className="text-sm font-medium text-white">
                  {userBalance} {groupData.token}
                </span>
              </div>
              {Number.parseFloat(userBalance) >= Number.parseFloat(groupData.contributionAmount) ? (
                <div className="flex items-center gap-2 mt-2 text-green-400 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Sufficient balance
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  Insufficient balance
                </div>
              )}
            </div>

            {/* Status Messages */}
            {isCheckingBalance && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking balance...
                </div>
              </div>
            )}

            {depositStatus === "success" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Contribution successful! Transaction confirmed.
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
                  isDepositing ||
                  Number.parseFloat(userBalance) < Number.parseFloat(groupData.contributionAmount) ||
                  depositStatus === "success"
                }
                className="flex-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {isDepositing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isCheckingBalance ? "Checking Balance..." : "Processing..."}
                  </>
                ) : depositStatus === "success" ? (
                  "Success!"
                ) : (
                  "Confirm Deposit"
                )}
              </Button>
              <Button
                onClick={() => setShowDepositModal(false)}
                variant="outline"
                className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                disabled={isDepositing}
              >
                Cancel
              </Button>
            </div>

            {/* Transaction Info */}
            <p className="text-xs text-white/50 text-center mt-4">
              This will trigger a wallet transaction. Make sure you have enough gas fees.
            </p>
          </div>
        </div>
      )}

      {/* Leave Group Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Leave Group</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to leave this group? This action cannot be undone and may affect the group's
              operation.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleLeaveGroup}
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
                  "Leave Group"
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

      {/* Shuffle Modal */}
      {showShuffleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                {isShuffling ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : shuffleResult ? (
                  <span className="text-2xl">🎉</span>
                ) : (
                  <TrendingUp className="h-8 w-8 text-white" />
                )}
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                {isShuffling ? "Running Shuffle..." : shuffleResult ? "Shuffle Complete!" : "Random Payout Selection"}
              </h3>

              {!isShuffling && !shuffleResult && (
                <p className="text-white/70 mb-6">
                  This will randomly select a member for the current round payout using verifiable on-chain randomness.
                </p>
              )}

              {isShuffling && <p className="text-white/70 mb-6">Generating random selection on-chain...</p>}

              {shuffleResult && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6">
                  <p className="text-green-400 font-medium">Selected Member:</p>
                  <p className="text-2xl font-bold text-white mt-1">{shuffleResult}</p>
                </div>
              )}

              <div className="flex gap-3">
                {!shuffleResult && (
                  <Button
                    onClick={handleRunShuffle}
                    disabled={isShuffling}
                    className="flex-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isShuffling ? "Shuffling..." : "Confirm Shuffle"}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowShuffleModal(false)
                    setShuffleResult(null)
                  }}
                  variant="outline"
                  className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  disabled={isShuffling}
                >
                  {shuffleResult ? "Close" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Modal */}
      {showVotingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Vote for Payout Recipient</h3>
            <p className="text-white/70 mb-6">
              Select which member should receive the payout for this round. Voting ends at{" "}
              {new Date(groupData!.votingEndTime!).toLocaleString()}.
            </p>

            <div className="space-y-3 mb-6">
              {groupData!.members
                .filter((m) => !m.isCurrentReceiver && m.contributionStatus !== "Received Payout")
                .map((member) => (
                  <button
                    key={member.address}
                    onClick={() => setSelectedVote(member.alias)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      selectedVote === member.alias
                        ? "bg-orange-500/20 border-orange-500/50 text-white"
                        : "bg-neutral-800/30 border-white/10 text-white/70 hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-semibold text-white">
                        {member.alias.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.alias}</p>
                        <p className="text-xs opacity-70 font-mono">
                          {member.address.slice(0, 6)}...{member.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleVote}
                disabled={!selectedVote || isVoting}
                className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Voting...
                  </>
                ) : (
                  "Submit Vote"
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowVotingModal(false)
                  setSelectedVote("")
                }}
                variant="outline"
                className="flex-1 rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                disabled={isVoting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
