"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  LogOut,
  Plus,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface ROSCAGroup {
  id: string
  name: string
  contributionAmount: string
  frequency: "Weekly" | "Monthly" | "Bi-weekly"
  currentRound: number
  totalRounds: number
  nextPayoutDate: string
  status: "Active" | "Completed" | "Pending"
  memberCount: number
  userPosition: number
}

export default function Dashboard() {
  const [userAddress, setUserAddress] = useState<string>("0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c")
  const [groups, setGroups] = useState<ROSCAGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching user's groups from smart contract
    console.log("[v0] Fetching groups for user:", userAddress)

    setTimeout(() => {
      const mockGroups: ROSCAGroup[] = [
        {
          id: "group-1",
          name: "Alpha Savers Circle",
          contributionAmount: "0.5 ETH",
          frequency: "Monthly",
          currentRound: 3,
          totalRounds: 12,
          nextPayoutDate: "2024-02-15",
          status: "Active",
          memberCount: 12,
          userPosition: 7,
        },
        {
          id: "group-2",
          name: "Beta Community Pool",
          contributionAmount: "100 USDC",
          frequency: "Weekly",
          currentRound: 8,
          totalRounds: 20,
          nextPayoutDate: "2024-01-28",
          status: "Active",
          memberCount: 20,
          userPosition: 15,
        },
        {
          id: "group-3",
          name: "Gamma Investment Club",
          contributionAmount: "1.0 ETH",
          frequency: "Bi-weekly",
          currentRound: 6,
          totalRounds: 6,
          nextPayoutDate: "Completed",
          status: "Completed",
          memberCount: 6,
          userPosition: 4,
        },
        {
          id: "group-4",
          name: "Delta Startup Fund",
          contributionAmount: "250 USDC",
          frequency: "Monthly",
          currentRound: 0,
          totalRounds: 15,
          nextPayoutDate: "2024-02-01",
          status: "Pending",
          memberCount: 15,
          userPosition: 8,
        },
      ]
      setGroups(mockGroups)
      setIsLoading(false)
    }, 1500)
  }, [userAddress])

  const handleDisconnect = () => {
    console.log("[v0] Disconnecting wallet")
    // Redirect to home page
    window.location.href = "/"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "Pending":
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className=" pt-4 pb-16">
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
                <Link href="/">
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
                    lines={["My Groups"]}
                  />
                  <p className="text-white/70 mt-1">
                    Connected: <span className="font-mono text-sm">{userAddress}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/create-group">
                  <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </RevealOnView>

          {/* Groups Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <RevealOnView key={i} delay={i * 0.1}>
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 animate-pulse">
                    <div className="h-6 bg-white/10 rounded mb-4"></div>
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 bg-white/10 rounded mb-4 w-3/4"></div>
                    <div className="flex gap-2 mb-4">
                      <div className="h-8 bg-white/10 rounded-full w-20"></div>
                      <div className="h-8 bg-white/10 rounded-full w-16"></div>
                    </div>
                  </div>
                </RevealOnView>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.map((group, idx) => (
                <RevealOnView key={group.id} delay={idx * 0.08}>
                  <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 hover:bg-neutral-900/80 transition-colors">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10 flex-1">
                      {/* Group Header */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">{group.name}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(group.status)}
                          <Badge className={`text-xs ${getStatusColor(group.status)}`}>{group.status}</Badge>
                        </div>
                      </div>

                      {/* Contribution Info */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-white/70">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">
                            {group.contributionAmount} • {group.frequency}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {group.memberCount} members • Position #{group.userPosition}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            Round {group.currentRound} of {group.totalRounds}
                          </span>
                        </div>

                        {group.status !== "Completed" && (
                          <div className="flex items-center gap-2 text-white/70">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">Next payout: {group.nextPayoutDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>Progress</span>
                          <span>{Math.round((group.currentRound / group.totalRounds) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${(group.currentRound / group.totalRounds) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="relative z-10">
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </RevealOnView>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && groups.length === 0 && (
            <RevealOnView className="text-center py-16">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-12">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Groups Yet</h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    You haven't joined any ROSCA groups yet. Create your first group or join an existing one to get
                    started.
                  </p>
                  <Link href="/create-group">
                    <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </Link>
                </div>
              </div>
            </RevealOnView>
          )}
        </div>
      </div>
    </main>
  )
}
