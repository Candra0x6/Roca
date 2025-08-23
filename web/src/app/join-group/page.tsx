"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Users, DollarSign, Clock, CheckCircle, AlertTriangle, Loader2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface GroupInfo {
  id: string
  name: string
  contributionAmount: string
  token: string
  frequency: string
  maxMembers: number
  currentMembers: number
  currentRound: number
  totalRounds: number
  nextPayoutDate: string
  status: "Active" | "Completed" | "Pending"
  availableSlots: number
  description: string
  createdBy: string
}

export default function JoinGroup() {
  const router = useRouter()
  const [groupId, setGroupId] = useState("")
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [error, setError] = useState("")

  // Auto-detect group ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const groupIdFromUrl = urlParams.get("id")
    if (groupIdFromUrl) {
      setGroupId(groupIdFromUrl)
      searchGroup(groupIdFromUrl)
    }
  }, [])

  const searchGroup = async (id: string) => {
    if (!id.trim()) return

    setIsSearching(true)
    setError("")
    setGroupInfo(null)

    console.log("[v0] Searching for group:", id)

    try {
      // Simulate smart contract call to fetch group details
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock group data - in real app, this would come from smart contract
      const mockGroupInfo: GroupInfo = {
        id: id,
        name: "Beta Builders Circle",
        contributionAmount: "0.05",
        token: "ETH",
        frequency: "Weekly",
        maxMembers: 8,
        currentMembers: 5,
        currentRound: 2,
        totalRounds: 8,
        nextPayoutDate: "2024-01-20T10:00:00Z",
        status: "Active",
        availableSlots: 3,
        description: "A weekly savings circle for builders and creators looking to grow their financial foundation.",
        createdBy: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
      }

      setGroupInfo(mockGroupInfo)
      console.log("[v0] Group found:", mockGroupInfo)
    } catch (err) {
      setError("Group not found or unable to fetch group details. Please check the Group ID and try again.")
      console.error("[v0] Error fetching group:", err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!groupInfo) return

    setIsJoining(true)
    console.log("[v0] Joining group:", groupInfo.id)

    try {
      // Simulate wallet transaction to join group
      await new Promise((resolve) => setTimeout(resolve, 3000))

      setHasJoined(true)
      console.log("[v0] Successfully joined group")

      // Redirect to group detail page after 2 seconds
      setTimeout(() => {
        router.push(`/group/${groupInfo.id}`)
      }, 2000)
    } catch (err) {
      setError("Failed to join group. Please try again.")
      console.error("[v0] Error joining group:", err)
    } finally {
      setIsJoining(false)
    }
  }

  const formatTimeUntilPayout = (dateString: string) => {
    const now = new Date().getTime()
    const payoutTime = new Date(dateString).getTime()
    const difference = payoutTime - now

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      return `${days}d ${hours}h`
    }
    return "Payout due"
  }

  if (hasJoined) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <AnimatedHeading className="text-2xl font-bold mb-2" lines={["Welcome to the Group!"]} />
            <p className="text-white/70">
              You've successfully joined <strong>{groupInfo?.name}</strong>. Redirecting to group details...
            </p>
          </div>
          <div className="animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
          </div>
        </div>
      </main>
    )
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

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
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
              </div>

              <AnimatedHeading
                className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-2"
                lines={["Join a ROSCA Group"]}
              />

              <p className="text-white/70">
                Enter a Group ID or use an invite link to join an existing savings circle.
              </p>
            </div>
          </RevealOnView>

          {/* Search Section */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mb-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4">Find Group</h3>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter Group ID (e.g., 0x742d35...)"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="rounded-full bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500/50 focus:ring-blue-500/20"
                      onKeyPress={(e) => e.key === "Enter" && searchGroup(groupId)}
                    />
                  </div>
                  <Button
                    onClick={() => searchGroup(groupId)}
                    disabled={isSearching || !groupId.trim()}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </RevealOnView>

          {/* Group Overview */}
          {groupInfo && (
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mb-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Group Overview</h3>
                    <Badge
                      variant={
                        groupInfo.status === "Active"
                          ? "default"
                          : groupInfo.status === "Completed"
                            ? "secondary"
                            : "outline"
                      }
                      className={`${
                        groupInfo.status === "Active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : groupInfo.status === "Completed"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {groupInfo.status}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-xl font-bold text-white mb-2">{groupInfo.name}</h4>
                    <p className="text-white/70 text-sm">{groupInfo.description}</p>
                  </div>

                  {/* Group Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-white/70">Contribution</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {groupInfo.contributionAmount} {groupInfo.token}
                      </p>
                      <p className="text-sm text-white/50">{groupInfo.frequency}</p>
                    </div>

                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-white/70">Members</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {groupInfo.currentMembers}/{groupInfo.maxMembers}
                      </p>
                      <p className="text-sm text-green-400">{groupInfo.availableSlots} slots available</p>
                    </div>

                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-white/70">Progress</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        Round {groupInfo.currentRound}/{groupInfo.totalRounds}
                      </p>
                      <p className="text-sm text-white/50">
                        {Math.round((groupInfo.currentRound / groupInfo.totalRounds) * 100)}% complete
                      </p>
                    </div>

                    <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <span className="text-sm text-white/70">Next Payout</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {formatTimeUntilPayout(groupInfo.nextPayoutDate)}
                      </p>
                      <p className="text-sm text-white/50">{new Date(groupInfo.nextPayoutDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Join Button */}
                  <div className="text-center">
                    {groupInfo.availableSlots > 0 && groupInfo.status === "Active" ? (
                      <Button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className="w-full sm:w-auto rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 px-8 py-3"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining Group...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            Join Group
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center">
                        <p className="text-white/70 mb-2">
                          {groupInfo.availableSlots === 0
                            ? "This group is full"
                            : "This group is not accepting new members"}
                        </p>
                        <Button disabled className="rounded-full bg-neutral-700 text-white/50 cursor-not-allowed">
                          Cannot Join
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RevealOnView>
          )}

          {/* Help Section */}
          <RevealOnView delay={0.3}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4">How to Join</h3>

                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      1
                    </div>
                    <p>Get a Group ID or invite link from an existing member</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      2
                    </div>
                    <p>Enter the Group ID in the search field above</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      3
                    </div>
                    <p>Review the group details and contribution requirements</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      4
                    </div>
                    <p>Click "Join Group" and confirm the transaction in your wallet</p>
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
