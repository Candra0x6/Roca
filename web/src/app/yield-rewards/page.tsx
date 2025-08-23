"use client"

import { useState } from "react"
import { ArrowLeft, TrendingUp, Gift, Trophy, Award, Coins, Zap, Star, Crown, Medal } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface YieldData {
  totalContributions: string
  totalYieldEarned: string
  currentAPY: string
  totalParticipants: number
}

interface BonusPrize {
  id: string
  type: "weekly_draw" | "milestone" | "referral"
  title: string
  amount: string
  date: string
  transactionHash: string
  description: string
}

interface NFTBadge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: "common" | "rare" | "epic" | "legendary"
  earnedDate: string
  category: "participation" | "achievement" | "milestone" | "special"
}

export default function YieldRewards() {
  const [yieldData] = useState<YieldData>({
    totalContributions: "12.5 SOL",
    totalYieldEarned: "1.85 SOL",
    currentAPY: "8.2%",
    totalParticipants: 156,
  })

  const [bonusPrizes] = useState<BonusPrize[]>([
    {
      id: "1",
      type: "weekly_draw",
      title: "Weekly Bonus Draw Winner",
      amount: "0.01 SOL",
      date: "2024-11-18",
      transactionHash: "0x1234...5678",
      description: "Won the weekly bonus draw in Week 47",
    },
    {
      id: "2",
      type: "milestone",
      title: "Early Adopter Bonus",
      amount: "0.05 SOL",
      date: "2024-10-15",
      transactionHash: "0x2345...6789",
      description: "Joined within the first 100 members",
    },
    {
      id: "3",
      type: "referral",
      title: "Referral Reward",
      amount: "0.02 SOL",
      date: "2024-11-01",
      transactionHash: "0x3456...7890",
      description: "Successfully referred 3 new members",
    },
  ])

  const [nftBadges] = useState<NFTBadge[]>([
    {
      id: "1",
      name: "Pioneer",
      description: "One of the first 50 members to join",
      imageUrl: "/golden-pioneer-badge.png",
      rarity: "legendary",
      earnedDate: "2024-10-01",
      category: "milestone",
    },
    {
      id: "2",
      name: "Consistent Contributor",
      description: "Made contributions for 10 consecutive rounds",
      imageUrl: "/silver-consistency-badge.png",
      rarity: "epic",
      earnedDate: "2024-11-10",
      category: "achievement",
    },
    {
      id: "3",
      name: "Community Builder",
      description: "Referred 5+ new members to the platform",
      imageUrl: "/bronze-community-badge.png",
      rarity: "rare",
      earnedDate: "2024-11-15",
      category: "participation",
    },
    {
      id: "4",
      name: "Lucky Winner",
      description: "Won a weekly bonus draw",
      imageUrl: "/placeholder-ahf7i.png",
      rarity: "common",
      earnedDate: "2024-11-18",
      category: "special",
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

  const totalBonusValue = bonusPrizes.reduce((sum, prize) => {
    const amount = Number.parseFloat(prize.amount.split(" ")[0])
    return sum + amount
  }, 0)

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="pt-4 pb-16 max-w-5xl  mx-auto">
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
                <span className="text-green-400 font-bold">+{yieldData.currentAPY} APY</span>
              </div>
            </div>
          </RevealOnView>

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
                  <div className="text-2xl font-bold text-blue-400">{yieldData.totalContributions}</div>
                  <div className="text-sm text-white/50 mt-1">Across all groups</div>
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
                  <div className="text-2xl font-bold text-green-400">{yieldData.totalYieldEarned}</div>
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
                  <div className="text-2xl font-bold text-yellow-400">{totalBonusValue.toFixed(2)} SOL</div>
                  <div className="text-sm text-white/50 mt-1">{bonusPrizes.length} prizes won</div>
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
                  <div className="text-2xl font-bold text-purple-400">{nftBadges.length}</div>
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
                      {bonusPrizes.map((prize) => (
                        <div
                          key={prize.id}
                          className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                            {getPrizeIcon(prize.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">{prize.title}</h3>
                              <span className="text-lg font-bold text-green-400">{prize.amount}</span>
                            </div>
                            <p className="text-sm text-white/70 mb-2">{prize.description}</p>
                            <div className="flex items-center gap-4 text-xs text-white/50">
                              <span>{prize.date}</span>
                              <span className="font-mono">{prize.transactionHash}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total Bonus Earnings</span>
                        <span className="text-xl font-bold text-green-400">{totalBonusValue.toFixed(2)} SOL</span>
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

                    <div className="grid grid-cols-2 gap-4">
                      {nftBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={`relative overflow-hidden rounded-xl border-2 ${getRarityBorder(badge.rarity)} bg-white/5 p-4 hover:bg-white/10 transition-colors group`}
                        >
                          <div className="text-center">
                            <div
                              className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} p-0.5`}
                            >
                              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center">
                                <img
                                  src={badge.imageUrl || "/placeholder.svg"}
                                  alt={badge.name}
                                  className="w-12 h-12 rounded-full"
                                />
                              </div>
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                            <Badge
                              className={`text-xs mb-2 bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white border-0`}
                            >
                              {badge.rarity}
                            </Badge>
                            <p className="text-xs text-white/60 mb-2">{badge.description}</p>
                            <div className="text-xs text-white/40">{badge.earnedDate}</div>
                          </div>

                          {/* Rarity glow effect */}
                          <div
                            className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(badge.rarity)} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`}
                          ></div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="text-center">
                        <div className="text-sm text-white/70 mb-1">Collection Progress</div>
                        <div className="text-lg font-bold text-purple-400">{nftBadges.length} / 12 Badges</div>
                        <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(nftBadges.length / 12) * 100}%` }}
                          ></div>
                        </div>
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
                  <h2 className="text-xl font-bold">Yield Distribution Details</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-cyan-400 mb-2">{yieldData.currentAPY}</div>
                    <div className="text-sm text-white/70">Current APY</div>
                    <div className="text-xs text-white/50 mt-1">Via Marinade Staking</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-green-400 mb-2">{yieldData.totalParticipants}</div>
                    <div className="text-sm text-white/70">Total Participants</div>
                    <div className="text-xs text-white/50 mt-1">Equal distribution</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-blue-400 mb-2">
                      {(
                        Number.parseFloat(yieldData.totalYieldEarned.split(" ")[0]) / yieldData.totalParticipants
                      ).toFixed(4)}{" "}
                      SOL
                    </div>
                    <div className="text-sm text-white/70">Your Share</div>
                    <div className="text-xs text-white/50 mt-1">Per participant</div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="text-sm text-white/70 mb-2">
                    <strong>How it works:</strong> All contributions are pooled and staked through Marinade to earn
                    yield. The earned yield is distributed equally among all active participants, regardless of
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
