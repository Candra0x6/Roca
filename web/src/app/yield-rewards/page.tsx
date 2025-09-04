"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Gift, Trophy, Award, Coins, Zap, Star, Crown, Medal } from "lucide-react"
import Link from "next/link"
import { formatEther } from "viem"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { useDashboard } from "@/hooks/useDashboard"
import { BadgeType } from "@/contracts/types"

export default function YieldRewards() {
  const {
    stats,
    userBadges,
    lotteryWins,
    isLoading,
    error,
    refresh,
  } = useDashboard()

  useEffect(() => {
    refresh()
  }, [refresh])

  // Badge utility functions
  const getBadgeRarityColor = (badgeType: BadgeType) => {
    switch (badgeType) {
      case BadgeType.LotteryWinnerBadge:
        return "from-yellow-500 to-orange-500"
      case BadgeType.PoolCompletionBadge:
        return "from-purple-500 to-pink-500"
      case BadgeType.JoinBadge:
        return "from-blue-500 to-cyan-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getBadgeRarityBorder = (badgeType: BadgeType) => {
    switch (badgeType) {
      case BadgeType.LotteryWinnerBadge:
        return "border-yellow-500/50"
      case BadgeType.PoolCompletionBadge:
        return "border-purple-500/50"
      case BadgeType.JoinBadge:
        return "border-blue-500/50"
      default:
        return "border-gray-500/50"
    }
  }

  const getBadgeName = (badgeType: BadgeType) => {
    switch (badgeType) {
      case BadgeType.JoinBadge:
        return "Pool Joiner"
      case BadgeType.LotteryWinnerBadge:
        return "Lucky Winner"
      case BadgeType.PoolCompletionBadge:
        return "Pool Completer"
      default:
        return "Badge"
    }
  }

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case "weekly_draw":
        return <Gift className="h-5 w-5" />
      case "milestone":
        return <Trophy className="h-5 w-5" />
      case "referral":
        return <Star className="h-5 w-5" />
      default:
        return <Award className="h-5 w-5" />
    }
  }

  const totalBonusValue = Number(formatEther(stats.totalBonusPrizes))

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="pt-4 pb-16 max-w-5xl mx-auto">
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
                    Back
                  </Button>
                </Link>

                <div>
                  <AnimatedHeading
                    className="text-2xl sm:text-3xl font-black leading-tight tracking-tight"
                    lines={["Yield & Rewards"]}
                  />
                  <p className="text-white/70 mt-1">Track your earnings and achievements</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-bold">Active</span>
              </div>
            </div>
          </RevealOnView>

          {/* Error State */}
          {error && (
            <RevealOnView>
              <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-red-900/20 p-6 mb-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold mb-2 text-red-400">Error Loading Data</h3>
                  <p className="text-white/70 mb-4">{error}</p>
                  <Button 
                    onClick={refresh}
                    className="rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </RevealOnView>
          )}

          {/* Financial Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <RevealOnView delay={0.1}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Coins className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white/80">Total Contributions</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {isLoading ? "..." : `${formatEther(stats.totalContributions)} ETH`}
                  </div>
                  <div className="text-sm text-white/50 mt-1">Across all pools</div>
                </div>
              </div>
            </RevealOnView>

            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <h3 className="font-semibold text-white/80">Total Yield Earned</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {isLoading ? "..." : `${formatEther(stats.totalYieldEarned)} ETH`}
                  </div>
                  <div className="text-sm text-white/50 mt-1">Distributed equally</div>
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
                    <Gift className="h-5 w-5 text-yellow-400" />
                    <h3 className="font-semibold text-white/80">Bonus Prizes</h3>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{totalBonusValue.toFixed(4)} ETH</div>
                  <div className="text-sm text-white/50 mt-1">{lotteryWins.length} prizes won</div>
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
                    <Medal className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white/80">NFT Badges</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{stats.totalBadges}</div>
                  <div className="text-sm text-white/50 mt-1">Achievements unlocked</div>
                </div>
              </div>
            </RevealOnView>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Bonus Prizes Section */}
            <div className="space-y-6">
              <RevealOnView delay={0.5}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Gift className="h-6 w-6 text-yellow-400" />
                      <h2 className="text-xl font-bold">Bonus Prizes Won</h2>
                    </div>

                    <div className="space-y-4">
                      {lotteryWins.length > 0 ? (
                        lotteryWins.map((round, index) => (
                          <div
                            key={round.round?.toString() || index}
                            className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                              {getPrizeIcon("weekly_draw")}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold">Lottery Winner</h3>
                                <span className="text-lg font-bold text-green-400">
                                  {formatEther(round.prizeAmount || 0n)} ETH
                                </span>
                              </div>
                              <p className="text-sm text-white/70 mb-2">
                                Won round #{round.round?.toString() || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-white/50">
                                <span>{new Date(Number(round.timestamp || 0n) * 1000).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Gift className="h-12 w-12 text-white/30 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Prizes Yet</h3>
                          <p className="text-white/60 text-sm">Participate in pools to enter weekly draws!</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total Bonus Earnings</span>
                        <span className="text-xl font-bold text-green-400">{totalBonusValue.toFixed(4)} ETH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>

            {/* NFT Badge Collection */}
            <div className="space-y-6">
              <RevealOnView delay={0.6}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Crown className="h-6 w-6 text-purple-400" />
                      <h2 className="text-xl font-bold">Badge Collection</h2>
                    </div>

                    {isLoading ? (
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="w-full h-32 bg-white/10 rounded-xl"></div>
                          </div>
                        ))}
                      </div>
                    ) : userBadges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {userBadges.map((badge) => (
                          <div
                            key={badge.tokenId.toString()}
                            className={`relative overflow-hidden rounded-xl border-2 ${getBadgeRarityBorder(badge.badgeType)} bg-white/5 p-4 hover:bg-white/10 transition-colors group`}
                          >
                            <div className="text-center">
                              <div
                                className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r ${getBadgeRarityColor(badge.badgeType)} p-0.5`}
                              >
                                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center">
                                  <Medal className="w-8 h-8 text-white" />
                                </div>
                              </div>
                              <h3 className="font-semibold text-sm mb-1">{getBadgeName(badge.badgeType)}</h3>
                              <Badge
                                className={`text-xs mb-2 bg-gradient-to-r ${getBadgeRarityColor(badge.badgeType)} text-white border-0`}
                              >
                                #{badge.tokenId.toString()}
                              </Badge>
                              <p className="text-xs text-white/60 mb-2">Pool Achievement Badge</p>
                              <div className="text-xs text-white/40">
                                {new Date(Number(badge.timestamp) * 1000).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Rarity glow effect */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-r ${getBadgeRarityColor(badge.badgeType)} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`}
                            ></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Medal className="h-12 w-12 text-white/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Badges Yet</h3>
                        <p className="text-white/60 text-sm">Complete pool activities to earn your first badge!</p>
                      </div>
                    )}

                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="text-center">
                        <div className="text-sm text-white/70 mb-1">Collection Progress</div>
                        <div className="text-lg font-bold text-purple-400">{stats.totalBadges} Badges Earned</div>
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>
          </div>

          {/* Yield Distribution Details */}
          <RevealOnView delay={0.7}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mt-8">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-6 w-6 text-cyan-400" />
                  <h2 className="text-xl font-bold">Pool Statistics</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-cyan-400 mb-2">{stats.activePoolsCount}</div>
                    <div className="text-sm text-white/70">Active Pools</div>
                    <div className="text-xs text-white/50 mt-1">Currently participating</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-green-400 mb-2">{stats.completedPoolsCount}</div>
                    <div className="text-sm text-white/70">Completed Pools</div>
                    <div className="text-xs text-white/50 mt-1">Successfully finished</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-blue-400 mb-2">
                      {formatEther(stats.totalYieldEarned)} ETH
                    </div>
                    <div className="text-sm text-white/70">Total Earned</div>
                    <div className="text-xs text-white/50 mt-1">All time yield</div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="text-sm text-white/70 mb-2">
                    <strong>How it works:</strong> All contributions are pooled and staked through our yield strategy to earn
                    rewards. The earned yield is distributed equally among all active participants, regardless of
                    individual contribution amounts.
                  </div>
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      </div>
    </main>
  )
}
