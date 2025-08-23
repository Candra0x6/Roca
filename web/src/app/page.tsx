"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  Coins,
  TrendingUp,
  Users,
  Globe,
  Lock,
  Trophy,
  Star,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import WalletConnect from "@/components/wallet-connect"
import { useNotificationHelpers } from "@/components/notifications/notification-helpers"

interface Pool {
  id: string
  name: string
  apy: string
  totalStaked: string
  members: number
  yieldEarned: string
  badges: string[]
  status: "Active" | "Completed" | "Pending"
  nextPayout: string
}

interface WeeklyWinner {
  name: string
  amount: string
  pool: string
  date: string
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [userAddress, setUserAddress] = useState<string>("")
  const [userPools, setUserPools] = useState<Pool[]>([])
  const [availablePools, setAvailablePools] = useState<Pool[]>([])
  const [weeklyWinners, setWeeklyWinners] = useState<WeeklyWinner[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { showSuccess, showReminder, showPayout, showError } = useNotificationHelpers()

  useEffect(() => {
    if (isConnected) {
      setIsLoading(true)
      setTimeout(() => {
        setUserPools([
          {
            id: "pool-1",
            name: "Alpha Staking Pool",
            apy: "10.5% APY from Marinade Staking",
            totalStaked: "125.5 SOL",
            members: 12,
            yieldEarned: "2.45 SOL",
            badges: ["Lucky Winner", "Diamond Hands"],
            status: "Active",
            nextPayout: "Dec 28, 2024",
          },
          {
            id: "pool-2",
            name: "Beta Community Pool",
            apy: "8.2% APY from Marinade Staking",
            totalStaked: "89.2 SOL",
            members: 8,
            yieldEarned: "1.12 SOL",
            badges: ["Unlucky but Loyal"],
            status: "Active",
            nextPayout: "Jan 2, 2025",
          },
        ])

        setAvailablePools([
          {
            id: "pool-3",
            name: "Gamma High Yield Pool",
            apy: "12.8% APY from Marinade Staking",
            totalStaked: "200.0 SOL",
            members: 15,
            yieldEarned: "0 SOL",
            badges: [],
            status: "Active",
            nextPayout: "Jan 5, 2025",
          },
          {
            id: "pool-4",
            name: "Delta Starter Pool",
            apy: "9.5% APY from Marinade Staking",
            totalStaked: "45.8 SOL",
            members: 6,
            yieldEarned: "0 SOL",
            badges: [],
            status: "Pending",
            nextPayout: "Jan 10, 2025",
          },
        ])

        setWeeklyWinners([
          { name: "Alice.sol", amount: "0.01 SOL", pool: "Alpha Pool", date: "Dec 20" },
          { name: "Bob.crypto", amount: "0.01 SOL", pool: "Beta Pool", date: "Dec 13" },
          { name: "Charlie.eth", amount: "0.01 SOL", pool: "Gamma Pool", date: "Dec 6" },
        ])

        setIsLoading(false)
      }, 1500)
    }
  }, [isConnected])

  const handleWalletConnection = (connected: boolean, address?: string) => {
    setIsConnected(connected)
    setUserAddress(address || "")

    if (connected && address) {
      showSuccess(`Wallet connected successfully! Address: ${address.slice(0, 6)}...${address.slice(-4)}`)
    } else {
      setUserPools([])
      setAvailablePools([])
      setWeeklyWinners([])
      showSuccess("Wallet disconnected successfully")
    }
  }

  if (!isConnected) {
    const features = [
      {
        icon: Shield,
        title: "Transparent & Secure",
        description: "All transactions recorded on-chain with full transparency and cryptographic security.",
        gradient: "from-blue-500 to-cyan-500",
      },
      {
        icon: Coins,
        title: "Rotating Savings",
        description: "Traditional ROSCA system enhanced with blockchain technology for global accessibility.",
        gradient: "from-purple-500 to-pink-500",
      },
      {
        icon: TrendingUp,
        title: "Yield Opportunities",
        description: "Earn rewards while participating in community savings circles.",
        gradient: "from-green-500 to-emerald-500",
      },
      {
        icon: Users,
        title: "Community Driven",
        description: "Join trusted groups or create your own savings circle with friends and family.",
        gradient: "from-orange-500 to-red-500",
      },
      {
        icon: Globe,
        title: "Global Access",
        description: "Participate from anywhere in the world with just a crypto wallet.",
        gradient: "from-indigo-500 to-purple-500",
      },
      {
        icon: Lock,
        title: "Smart Contracts",
        description: "Automated payouts and contributions managed by audited smart contracts.",
        gradient: "from-teal-500 to-blue-500",
      },
    ]

    return (
      <main className="bg-neutral-950 text-white flex justify-center w-full">
        <section className="pt-4 pb-16 lg:pb-4 max-w-5xl mx-auto">
          <div className="grid h-full gap-4 w-full">
            <div className="h-fit flex w-full">
                <div

                  className="relative flex h-fit w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8"
                >
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="">
                  <div className="mb-8 flex items-center gap-2">
                    <div className="text-2xl font-extrabold tracking-tight">Decentralized</div>
                    <div className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                    <div className="text-2xl font-extrabold tracking-tight text-blue-400">Arey</div>
                  </div>

                  <AnimatedHeading
                    className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl"
                    lines={["Join a transparent", "ROSCA on-chain"]}
                  />

                  <p className="mt-4 max-w-[42ch] text-lg text-white/70">
                    Decentralized Arisan brings traditional rotating savings and credit associations to the blockchain.
                    Create or join trusted savings circles with complete transparency and security.
                  </p>

                  <div className="mt-6 w-fit">
                    <WalletConnect onConnectionChange={handleWalletConnection} />
                  </div>

                  <div className="mt-10">
                    <p className="mb-3 text-xs font-semibold tracking-widest text-white/50">POWERED BY</p>
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-2xl font-black text-white/25 sm:grid-cols-3">
                      <li>Somnia</li>
                    
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 grid  lg:grid-cols-3 md:grid-cols-2 h-full gap-5">
              {features.map((feature, idx) => (
                <div className="h-full">
                  <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 ">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <div className={`inline-flex rounded-2xl bg-gradient-to-r ${feature.gradient} p-3 mb-4`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-white/70 text-lg leading-relaxed">{feature.description}</p>
                    </div>

                    <div className="relative z-10 mt-6">
                      <Button
                        variant="outline"
                        className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>))}
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="pt-4 pb-16">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <RevealOnView
            as="header"
            intensity="hero"
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
              <DotGridShader />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <AnimatedHeading
                  className="text-3xl sm:text-4xl font-black leading-tight tracking-tight"
                  lines={["Dashboard"]}
                />
                <p className="text-white/70 mt-1">
                  Welcome back,{" "}
                  <span className="font-mono text-sm">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/create-pool">
                  <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Pool
                  </Button>
                </Link>

                <Link href="/join-group">
                  <Button
                    variant="outline"
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    Join Pool
                  </Button>
                </Link>
              </div>
            </div>
          </RevealOnView>

          {/* Weekly Bonus Winner Announcement */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 p-3">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-yellow-400 mb-1">🎉 Weekly Bonus Winner!</h3>
                  <p className="text-white/90">
                    Congratulations to <span className="font-bold text-yellow-300">{weeklyWinners[0]?.name}</span> for
                    winning <span className="font-bold text-yellow-300">{weeklyWinners[0]?.amount}</span> in the{" "}
                    {weeklyWinners[0]?.pool}!
                  </p>
                </div>

                <Link href="/bonus-draw">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
                  >
                    View Draw
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </RevealOnView>

          {/* My Active Pools */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">My Active Pools</h2>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <RevealOnView key={i} delay={i * 0.1}>
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 animate-pulse">
                      <div className="h-6 bg-white/10 rounded mb-4"></div>
                      <div className="h-4 bg-white/10 rounded mb-2"></div>
                      <div className="h-4 bg-white/10 rounded mb-4 w-3/4"></div>
                    </div>
                  </RevealOnView>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userPools.map((pool, idx) => (
                  <RevealOnView key={pool.id} delay={0.2 + idx * 0.1}>
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 hover:bg-neutral-900/80 transition-colors">
                      <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                        <DotGridShader />
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold">{pool.name}</h3>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{pool.status}</Badge>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2 text-cyan-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-semibold">{pool.apy}</span>
                          </div>

                          <div className="flex items-center gap-2 text-white/70">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">
                              Yield Earned: <span className="text-green-400 font-semibold">{pool.yieldEarned}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-white/70">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">
                              {pool.members} members • {pool.totalStaked} total
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-white/70">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">Next payout: {pool.nextPayout}</span>
                          </div>
                        </div>

                        {pool.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {pool.badges.map((badge) => (
                              <Badge
                                key={badge}
                                className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Link href={`/group/${pool.id}`}>
                          <Button
                            variant="outline"
                            className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                          >
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </RevealOnView>
                ))}
              </div>
            )}
          </div>

          {/* Available Pools */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Available Pools</h2>
              <Link href="/join-group">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  Browse All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availablePools.map((pool, idx) => (
                <RevealOnView key={pool.id} delay={0.4 + idx * 0.1}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 hover:bg-neutral-900/80 transition-colors">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold">{pool.name}</h3>
                        <Badge
                          className={
                            pool.status === "Active"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {pool.status}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-semibold">{pool.apy}</span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {pool.members} members • {pool.totalStaked} total
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Starts: {pool.nextPayout}</span>
                        </div>
                      </div>

                      <Link href={`/join-group?pool=${pool.id}`}>
                        <Button className="w-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                          Join Pool
                        </Button>
                      </Link>
                    </div>
                  </div>
                </RevealOnView>
              ))}
            </div>
          </div>

          {/* Recent Winners */}
          <RevealOnView delay={0.6}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Recent Winners</h2>
                  <Link href="/bonus-draw">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                <div className="space-y-3">
                  {weeklyWinners.map((winner, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{winner.name}</p>
                          <p className="text-sm text-white/70">{winner.pool}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-yellow-400">{winner.amount}</p>
                        <p className="text-sm text-white/70">{winner.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      </div>
    </main>
  )
}
