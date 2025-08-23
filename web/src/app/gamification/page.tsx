"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Trophy, Medal, Crown, Star, TrendingUp, Users, Zap, Gift, Target, Heart } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface GameBadge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: "common" | "rare" | "epic" | "legendary"
  category: "achievement" | "loyalty" | "participation"
  requirements: string
  earned: boolean
  earnedDate?: string
  icon: React.ReactNode
}

interface LeaderboardEntry {
  id: string
  address: string
  displayName?: string
  value: string
  rank: number
  badge?: string
  change: "up" | "down" | "same"
}

export default function Gamification() {
  const [gameBadges] = useState<GameBadge[]>([
    {
      id: "lucky-winner",
      name: "Lucky Winner",
      description: "Won at least one weekly bonus draw",
      imageUrl: "/placeholder-km0uk.png",
      rarity: "rare",
      category: "achievement",
      requirements: "Win 1+ weekly bonus draws",
      earned: true,
      earnedDate: "2024-11-18",
      icon: <Gift className="h-5 w-5" />,
    },
    {
      id: "diamond-hands",
      name: "Diamond Hands",
      description: "Remained invested until the end of pool duration",
      imageUrl: "/placeholder-aom9j.png",
      rarity: "epic",
      category: "loyalty",
      requirements: "Complete full pool duration",
      earned: true,
      earnedDate: "2024-11-15",
      icon: <Crown className="h-5 w-5" />,
    },
    {
      id: "unlucky-loyal",
      name: "Unlucky but Loyal",
      description: "Stayed for full duration without winning weekly draws",
      imageUrl: "/heart-badge-ribbon.png",
      rarity: "common",
      category: "loyalty",
      requirements: "Complete pool without weekly wins",
      earned: false,
      icon: <Heart className="h-5 w-5" />,
    },
    {
      id: "multi-pool-master",
      name: "Multi-Pool Master",
      description: "Active participant in 5+ different pools",
      imageUrl: "/interconnected-circles.png",
      rarity: "legendary",
      category: "participation",
      requirements: "Join 5+ different pools",
      earned: false,
      icon: <Target className="h-5 w-5" />,
    },
    {
      id: "early-bird",
      name: "Early Bird",
      description: "Joined within first 24 hours of pool creation",
      imageUrl: "/bird-with-clock.png",
      rarity: "rare",
      category: "participation",
      requirements: "Join pool within 24 hours",
      earned: true,
      earnedDate: "2024-10-01",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: "streak-keeper",
      name: "Streak Keeper",
      description: "Made contributions for 20+ consecutive rounds",
      imageUrl: "/flame-streak-badge.png",
      rarity: "epic",
      category: "achievement",
      requirements: "20+ consecutive contributions",
      earned: false,
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ])

  const [biggestEarners] = useState<LeaderboardEntry[]>([
    {
      id: "1",
      address: "0x1234...5678",
      displayName: "CryptoWhale",
      value: "15.67 SOL",
      rank: 1,
      badge: "Diamond Hands",
      change: "same",
    },
    {
      id: "2",
      address: "0x2345...6789",
      displayName: "YieldFarmer",
      value: "12.34 SOL",
      rank: 2,
      badge: "Lucky Winner",
      change: "up",
    },
    {
      id: "3",
      address: "0x3456...7890",
      value: "9.87 SOL",
      rank: 3,
      change: "down",
    },
    {
      id: "4",
      address: "0x4567...8901",
      displayName: "PoolMaster",
      value: "8.45 SOL",
      rank: 4,
      badge: "Multi-Pool Master",
      change: "up",
    },
    {
      id: "5",
      address: "0x5678...9012",
      value: "7.23 SOL",
      rank: 5,
      change: "same",
    },
  ])

  const [mostActiveUsers] = useState<LeaderboardEntry[]>([
    {
      id: "1",
      address: "0x2345...6789",
      displayName: "PoolHopper",
      value: "12 Pools",
      rank: 1,
      badge: "Multi-Pool Master",
      change: "same",
    },
    {
      id: "2",
      address: "0x1234...5678",
      displayName: "CryptoWhale",
      value: "8 Pools",
      rank: 2,
      badge: "Diamond Hands",
      change: "up",
    },
    {
      id: "3",
      address: "0x6789...0123",
      displayName: "CommunityBuilder",
      value: "6 Pools",
      rank: 3,
      badge: "Early Bird",
      change: "down",
    },
    {
      id: "4",
      address: "0x7890...1234",
      value: "5 Pools",
      rank: 4,
      change: "up",
    },
    {
      id: "5",
      address: "0x8901...2345",
      displayName: "SteadyInvestor",
      value: "4 Pools",
      rank: 5,
      change: "same",
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-white/60 font-bold">#{rank}</span>
    }
  }

  const getChangeIcon = (change: string) => {
    switch (change) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
      default:
        return <div className="w-4 h-4 rounded-full bg-white/20" />
    }
  }

  const earnedBadges = gameBadges.filter((badge) => badge.earned)
  const availableBadges = gameBadges.filter((badge) => !badge.earned)

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
                    Back
                  </Button>
                </Link>

                <div>
                  <AnimatedHeading
                    className="text-2xl sm:text-3xl font-black leading-tight tracking-tight"
                    lines={["Gamification Hub"]}
                  />
                  <p className="text-white/70 mt-1">Achievements, badges, and leaderboards</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {earnedBadges.length}/{gameBadges.length} Badges
                </span>
              </div>
            </div>
          </RevealOnView>

          {/* Badge Collection */}
          <div className="grid gap-8 lg:grid-cols-2 mb-8">
            {/* Earned Badges */}
            <RevealOnView delay={0.1}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Crown className="h-6 w-6 text-yellow-400" />
                    <h2 className="text-xl font-bold">Earned Badges</h2>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {earnedBadges.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {earnedBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`relative overflow-hidden rounded-xl border-2 ${getRarityBorder(badge.rarity)} bg-white/5 p-4 hover:bg-white/10 transition-colors group`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} p-0.5 flex-shrink-0`}
                          >
                            <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center">
                              {badge.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                            <Badge
                              className={`text-xs mb-2 bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white border-0`}
                            >
                              {badge.rarity}
                            </Badge>
                            <p className="text-xs text-white/60 mb-2">{badge.description}</p>
                            {badge.earnedDate && (
                              <div className="text-xs text-green-400">Earned: {badge.earnedDate}</div>
                            )}
                          </div>
                        </div>

                        {/* Rarity glow effect */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(badge.rarity)} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnView>

            {/* Available Badges */}
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="h-6 w-6 text-blue-400" />
                    <h2 className="text-xl font-bold">Available Badges</h2>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{availableBadges.length}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`relative overflow-hidden rounded-xl border-2 border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors group opacity-60`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/10 p-0.5 flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-white/40">
                              {badge.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1 text-white/70">{badge.name}</h3>
                            <Badge className="text-xs mb-2 bg-white/10 text-white/60 border-0">{badge.rarity}</Badge>
                            <p className="text-xs text-white/50 mb-2">{badge.description}</p>
                            <div className="text-xs text-blue-400">{badge.requirements}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnView>
          </div>

          {/* Leaderboards */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Biggest Earners */}
            <RevealOnView delay={0.3}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                    <h2 className="text-xl font-bold">Biggest Earners</h2>
                  </div>

                  <div className="space-y-3">
                    {biggestEarners.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8">{getRankIcon(entry.rank)}</div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                            </span>
                            {entry.badge && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                                {entry.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-white/60">{entry.address}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">{entry.value}</div>
                          <div className="flex items-center gap-1">{getChangeIcon(entry.change)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnView>

            {/* Most Active Users */}
            <RevealOnView delay={0.4}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="h-6 w-6 text-purple-400" />
                    <h2 className="text-xl font-bold">Most Active in Multiple Pools</h2>
                  </div>

                  <div className="space-y-3">
                    {mostActiveUsers.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8">{getRankIcon(entry.rank)}</div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                            </span>
                            {entry.badge && (
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                {entry.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-white/60">{entry.address}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-400">{entry.value}</div>
                          <div className="flex items-center gap-1">{getChangeIcon(entry.change)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnView>
          </div>

          {/* Gamification Stats */}
          <RevealOnView delay={0.5}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mt-8">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="h-6 w-6 text-cyan-400" />
                  <h2 className="text-xl font-bold">Your Gamification Progress</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-yellow-400 mb-2">{earnedBadges.length}</div>
                    <div className="text-sm text-white/70">Badges Earned</div>
                    <div className="text-xs text-white/50 mt-1">Out of {gameBadges.length}</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-green-400 mb-2">#2</div>
                    <div className="text-sm text-white/70">Earnings Rank</div>
                    <div className="text-xs text-white/50 mt-1">Top 5%</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-purple-400 mb-2">8</div>
                    <div className="text-sm text-white/70">Pools Joined</div>
                    <div className="text-xs text-white/50 mt-1">Multi-pool expert</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-blue-400 mb-2">92%</div>
                    <div className="text-sm text-white/70">Completion Rate</div>
                    <div className="text-xs text-white/50 mt-1">Very reliable</div>
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
