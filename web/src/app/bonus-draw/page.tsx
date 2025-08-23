"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trophy, Gift, Zap, Clock, Crown, Star } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { useNotifications } from "@/components/notifications/notification-provider"

interface Winner {
  id: string
  name: string
  address: string
  amount: string
  week: number
  date: string
  transactionHash: string
}

interface Participant {
  id: string
  name: string
  address: string
  tickets: number
}

export default function WeeklyBonusDraw() {
  const { addNotification } = useNotifications()
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [spinAngle, setSpinAngle] = useState(0)
  const [timeUntilDraw, setTimeUntilDraw] = useState({
    days: 2,
    hours: 14,
    minutes: 32,
    seconds: 45,
  })

  const [participants] = useState<Participant[]>([
    { id: "1", name: "Alpha Trader", address: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c", tickets: 5 },
    { id: "2", name: "Crypto Whale", address: "0x8ba1f109551bD432803012645Hac136c22C501e", tickets: 8 },
    { id: "3", name: "DeFi Master", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", tickets: 3 },
    { id: "4", name: "Yield Farmer", address: "0xA0b86a33E6441E13C7d3fF2C4567E0A9e0C2D2E3", tickets: 6 },
    { id: "5", name: "Staking Pro", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", tickets: 4 },
  ])

  const [pastWinners] = useState<Winner[]>([
    {
      id: "1",
      name: "Crypto Whale",
      address: "0x8ba1f109551bD432803012645Hac136c22C501e",
      amount: "0.01 SOL",
      week: 47,
      date: "2024-11-18",
      transactionHash: "0x1234...5678",
    },
    {
      id: "2",
      name: "DeFi Master",
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      amount: "0.01 SOL",
      week: 46,
      date: "2024-11-11",
      transactionHash: "0x2345...6789",
    },
    {
      id: "3",
      name: "Alpha Trader",
      address: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
      amount: "0.01 SOL",
      week: 45,
      date: "2024-11-04",
      transactionHash: "0x3456...7890",
    },
    {
      id: "4",
      name: "Yield Farmer",
      address: "0xA0b86a33E6441E13C7d3fF2C4567E0A9e0C2D2E3",
      amount: "0.01 SOL",
      week: 44,
      date: "2024-10-28",
      transactionHash: "0x4567...8901",
    },
  ])

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilDraw((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleRunDraw = async () => {
    setIsDrawing(true)

    // Animate the wheel spinning
    const spins = 5 + Math.random() * 5 // 5-10 full rotations
    const finalAngle = spins * 360 + Math.random() * 360
    setSpinAngle(finalAngle)

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // Select random winner
    const randomIndex = Math.floor(Math.random() * participants.length)
    const winner = participants[randomIndex]

    const newWinner: Winner = {
      id: Date.now().toString(),
      name: winner.name,
      address: winner.address,
      amount: "0.01 SOL",
      week: 48,
      date: new Date().toISOString().split("T")[0],
      transactionHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
    }

    setCurrentWinner(newWinner)
    setIsDrawing(false)
    setShowWinnerModal(true)

    addNotification({
      type: "payout",
      title: "🎉 Bonus Draw Winner!",
      message: `${winner.name} won 0.01 SOL in the weekly bonus draw!`,
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0)

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
                    lines={["Weekly Bonus Draw"]}
                  />
                  <p className="text-white/70 mt-1">Transparent and provably fair weekly rewards</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold">0.01 SOL Prize</span>
              </div>
            </div>
          </RevealOnView>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Draw Section */}
            <div className="space-y-6">
              {/* Countdown Timer */}
              <RevealOnView delay={0.1}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="h-5 w-5 text-blue-400" />
                      <h2 className="text-xl font-bold">Next Draw In</h2>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: "Days", value: timeUntilDraw.days },
                        { label: "Hours", value: timeUntilDraw.hours },
                        { label: "Minutes", value: timeUntilDraw.minutes },
                        { label: "Seconds", value: timeUntilDraw.seconds },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 border border-blue-500/30">
                            <div className="text-2xl font-bold text-blue-400">
                              {item.value.toString().padStart(2, "0")}
                            </div>
                            <div className="text-xs text-white/50">{item.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Spinning Wheel */}
              <RevealOnView delay={0.2}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <h2 className="text-xl font-bold">Bonus Draw Wheel</h2>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {totalTickets} Total Tickets
                      </Badge>
                    </div>

                    {/* Wheel Container */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-64 h-64 mb-6">
                        {/* Wheel */}
                        <div
                          className="w-full h-full rounded-full border-4 border-white/20 relative overflow-hidden transition-transform duration-4000 ease-out"
                          style={{ transform: `rotate(${spinAngle}deg)` }}
                        >
                          {participants.map((participant, index) => {
                            const angle = (360 / participants.length) * index
                            const nextAngle = (360 / participants.length) * (index + 1)
                            const colors = [
                              "from-red-500 to-red-600",
                              "from-blue-500 to-blue-600",
                              "from-green-500 to-green-600",
                              "from-yellow-500 to-yellow-600",
                              "from-purple-500 to-purple-600",
                            ]

                            return (
                              <div
                                key={participant.id}
                                className={`absolute w-full h-full bg-gradient-to-r ${colors[index % colors.length]} opacity-80`}
                                style={{
                                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(((angle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((angle - 90) * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((nextAngle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((nextAngle - 90) * Math.PI) / 180)}%)`,
                                }}
                              >
                                <div
                                  className="absolute text-xs font-bold text-white"
                                  style={{
                                    top: "50%",
                                    left: "50%",
                                    transform: `translate(-50%, -50%) rotate(${angle + (360 / participants.length) / 2}deg) translateY(-60px)`,
                                  }}
                                >
                                  {participant.name.split(" ")[0]}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Pointer */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
                        </div>

                        {/* Center Circle */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-neutral-900 rounded-full border-4 border-white/20 flex items-center justify-center">
                          <Trophy className="h-6 w-6 text-yellow-400" />
                        </div>
                      </div>

                      <Button
                        onClick={handleRunDraw}
                        disabled={isDrawing}
                        className="rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 disabled:opacity-50 px-8 py-3"
                      >
                        {isDrawing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Drawing Winner...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Run Weekly Draw
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>

            {/* Participants & Leaderboard */}
            <div className="space-y-6">
              {/* Current Participants */}
              <RevealOnView delay={0.3}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <Star className="h-5 w-5 text-blue-400" />
                      <h2 className="text-xl font-bold">Current Participants</h2>
                    </div>

                    <div className="space-y-3">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div>
                            <div className="font-medium">{participant.name}</div>
                            <div className="text-sm text-white/50 font-mono">{formatAddress(participant.address)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-blue-400">{participant.tickets} tickets</div>
                            <div className="text-xs text-white/50">
                              {((participant.tickets / totalTickets) * 100).toFixed(1)}% chance
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Past Winners Leaderboard */}
              <RevealOnView delay={0.4}>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                  <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                    <DotGridShader />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      <h2 className="text-xl font-bold">Past Winners</h2>
                    </div>

                    <div className="space-y-3">
                      {pastWinners.map((winner, index) => (
                        <div
                          key={winner.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : index === 1
                                    ? "bg-gray-500/20 text-gray-400"
                                    : index === 2
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-white/10 text-white/70"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{winner.name}</div>
                              <div className="text-sm text-white/50">
                                Week {winner.week} • {winner.date}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-400">{winner.amount}</div>
                            <div className="text-xs text-white/50 font-mono">{winner.transactionHash}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {showWinnerModal && currentWinner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-8 max-w-md w-full">
            <div className="pointer-events-none absolute inset-0 opacity-10 mix-blend-soft-light">
              <DotGridShader />
            </div>

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Trophy className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-2">🎉 Congratulations!</h2>
              <p className="text-white/70 mb-6">We have a winner for this week's bonus draw!</p>

              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <div className="text-xl font-bold text-yellow-400 mb-2">{currentWinner.name}</div>
                <div className="text-sm text-white/50 font-mono mb-3">{formatAddress(currentWinner.address)}</div>
                <div className="text-2xl font-bold text-green-400">{currentWinner.amount}</div>
              </div>

              <p className="text-sm text-white/50 mb-6">
                The payout has been automatically sent to the winner's wallet. Transaction:{" "}
                {currentWinner.transactionHash}
              </p>

              <Button
                onClick={() => setShowWinnerModal(false)}
                className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
