"use client"

import { useState } from "react"
import {
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Gift,
  Trophy,
  Coins,
  Zap,
  Star,
  Crown,
  Medal,
  Clock,
  Users,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface PoolSummary {
  poolName: string
  duration: string
  endDate: string
  totalMembers: number
  initialDeposit: string
  yieldEarned: string
  finalAmount: string
  weeklyPrizesWon: number
  badgesUnlocked: number
}

interface WeeklyPrize {
  id: string
  week: number
  amount: string
  date: string
  transactionHash: string
}

interface UnlockedBadge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: "common" | "rare" | "epic" | "legendary"
  earnedDate: string
}

export default function EndPool() {
  const [poolSummary] = useState<PoolSummary>({
    poolName: "Solana Savers Circle #1",
    duration: "3 months",
    endDate: "2024-12-01",
    totalMembers: 12,
    initialDeposit: "1.0 SOL",
    yieldEarned: "0.05 SOL",
    finalAmount: "1.05 SOL",
    weeklyPrizesWon: 2,
    badgesUnlocked: 3,
  })

  const [weeklyPrizes] = useState<WeeklyPrize[]>([
    {
      id: "1",
      week: 3,
      amount: "0.01 SOL",
      date: "2024-10-20",
      transactionHash: "0x1234...5678",
    },
    {
      id: "2",
      week: 8,
      amount: "0.01 SOL",
      date: "2024-11-24",
      transactionHash: "0x2345...6789",
    },
  ])

  const [unlockedBadges] = useState<UnlockedBadge[]>([
    {
      id: "1",
      name: "Pool Completer",
      description: "Successfully completed a 3-month pool",
      imageUrl: "/golden-pioneer-badge.png",
      rarity: "epic",
      earnedDate: "2024-12-01",
    },
    {
      id: "2",
      name: "Consistent Saver",
      description: "Made all contributions on time",
      imageUrl: "/silver-consistency-badge.png",
      rarity: "rare",
      earnedDate: "2024-12-01",
    },
    {
      id: "3",
      name: "Lucky Winner",
      description: "Won weekly bonus draws",
      imageUrl: "/bronze-community-badge.png",
      rarity: "common",
      earnedDate: "2024-11-24",
    },
  ])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-500 to-orange-500"
      case "epic":
        return "from-purple-500 to-pink-500"
      case "rare":
        return "from-blue-500 to-cyan-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "border-yellow-500/50"
      case "epic":
        return "border-purple-500/50"
      case "rare":
        return "border-blue-500/50"
      default:
        return "border-gray-500/50"
    }
  }

  const totalWeeklyPrizes = weeklyPrizes.reduce((sum, prize) => {
    return sum + Number.parseFloat(prize.amount.split(" ")[0])
  }, 0)

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

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>

                <div>
                  <AnimatedHeading
                    className="text-2xl sm:text-3xl font-black leading-tight tracking-tight"
                    lines={["Pool Completed!"]}
                  />
                  <p className="text-white/70 mt-1">
                    {poolSummary.poolName} • {poolSummary.duration}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-green-400 font-bold">Successfully Completed</span>
              </div>
            </div>
          </RevealOnView>

          {/* Automated Unstaking Notice */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 mb-8">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-2">Automated Unstaking Complete</h3>
                  <p className="text-white/80 mb-3">
                    The smart contract has automatically unstaked all funds from Marinade at the end of the pool
                    duration. Principal and yield have been distributed equally among all {poolSummary.totalMembers}{" "}
                    members.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Completed on {poolSummary.endDate}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {poolSummary.totalMembers} members
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnView>

          {/* Final Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Coins className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white/80">Initial Deposit</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{poolSummary.initialDeposit}</div>
                  <div className="text-sm text-white/50 mt-1">Your contribution</div>
                </div>
              </div>
            </RevealOnView>

            <RevealOnView delay={0.3}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <h3 className="font-semibold text-white/80">Yield Earned</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-400">+{poolSummary.yieldEarned}</div>
                  <div className="text-sm text-white/50 mt-1">From staking rewards</div>
                </div>
              </div>
            </RevealOnView>

            <RevealOnView delay={0.4}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Gift className="h-5 w-5 text-yellow-400" />
                    <h3 className="font-semibold text-white/80">Weekly Prizes</h3>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">+{totalWeeklyPrizes.toFixed(2)} SOL</div>
                  <div className="text-sm text-white/50 mt-1">{poolSummary.weeklyPrizesWon} prizes won</div>
                </div>
              </div>
            </RevealOnView>

            <RevealOnView delay={0.5}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Medal className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white/80">Badges Unlocked</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{poolSummary.badgesUnlocked}</div>
                  <div className="text-sm text-white/50 mt-1">New achievements</div>
                </div>
              </div>
            </RevealOnView>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Final Amount Summary */}
            <RevealOnView delay={0.6}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Trophy className="h-6 w-6 text-cyan-400" />
                    <h2 className="text-xl font-bold">Final Summary</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-white/70">Initial Deposit</span>
                      <span className="font-bold text-blue-400">{poolSummary.initialDeposit}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-white/70">Staking Yield</span>
                      <span className="font-bold text-green-400">+{poolSummary.yieldEarned}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-white/70">Weekly Prizes</span>
                      <span className="font-bold text-yellow-400">+{totalWeeklyPrizes.toFixed(2)} SOL</span>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                    <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                      <span className="text-lg font-semibold">Total Received</span>
                      <span className="text-2xl font-bold text-cyan-400">
                        {(
                          Number.parseFloat(poolSummary.initialDeposit.split(" ")[0]) +
                          Number.parseFloat(poolSummary.yieldEarned.split(" ")[0]) +
                          totalWeeklyPrizes
                        ).toFixed(2)}{" "}
                        SOL
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="text-sm text-white/70">
                      <strong>Distribution Method:</strong> All principal and yield were distributed equally among the{" "}
                      {poolSummary.totalMembers} pool members through automated smart contract execution.
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnView>

            {/* Weekly Prizes & Badges */}
            <div className="space-y-6">
              {/* Weekly Prizes Won */}
              <RevealOnView delay={0.7}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Gift className="h-6 w-6 text-yellow-400" />
                      <h2 className="text-xl font-bold">Weekly Prizes Won</h2>
                    </div>

                    <div className="space-y-3">
                      {weeklyPrizes.map((prize) => (
                        <div
                          key={prize.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div>
                            <div className="font-semibold">Week {prize.week}</div>
                            <div className="text-sm text-white/60">{prize.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-yellow-400">{prize.amount}</div>
                            <div className="text-xs text-white/50 font-mono">{prize.transactionHash}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Badges Unlocked */}
              <RevealOnView delay={0.8}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Crown className="h-6 w-6 text-purple-400" />
                      <h2 className="text-xl font-bold">Badges Unlocked</h2>
                    </div>

                    <div className="space-y-3">
                      {unlockedBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 ${getRarityBorder(badge.rarity)} bg-white/5`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} p-0.5 flex-shrink-0`}
                          >
                            <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center">
                              <img
                                src={badge.imageUrl || "/placeholder.svg"}
                                alt={badge.name}
                                className="w-8 h-8 rounded-full"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{badge.name}</h3>
                              <Badge
                                className={`text-xs bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white border-0`}
                              >
                                {badge.rarity}
                              </Badge>
                            </div>
                            <p className="text-sm text-white/70">{badge.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>
          </div>

          {/* Action Buttons */}
          <RevealOnView delay={0.9}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/create-group">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-full px-8 py-3">
                  <Star className="h-5 w-5 mr-2" />
                  Create New Pool
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent rounded-full px-8 py-3"
                >
                  View All Groups
                </Button>
              </Link>
            </div>
          </RevealOnView>
        </div>
      </div>
    </main>
  )
}
