"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Users, DollarSign, Clock, CheckCircle, AlertTriangle, Loader2, Search, Filter } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatEther } from "viem"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { usePoolDiscovery, usePoolFilters, PoolListItem } from "@/hooks/usePoolDiscovery"
import { PoolState } from "@/contracts/types"
import { usePool } from "@/hooks"
import { usePoolInfo } from "@/hooks/usePool"

export default function JoinGroup() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [selectedPool, setSelectedPool] = useState<PoolListItem | null>(null)
  // Smart contract hooks

  const { pools, isLoading, error, refetch } = usePoolDiscovery()
  const filterPools = usePoolFilters(pools)
  console.log(pools)
  // Filter pools based on current selection
  const filteredPools = (() => {
    let filtered = pools

    // Apply filter
    switch (selectedFilter) {
      case "open":
        filtered = filterPools.byState(PoolState.Open)
        break
      case "active":
        filtered = filterPools.byState(PoolState.Active)
        break
      case "available":
        filtered = filterPools.byAvailableSlots()
        break
      default:
        filtered = filterPools.all()
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filterPools.search(searchQuery)
    }

    return filtered
  })()

  const getPoolStatusBadge = (pool: PoolListItem) => {
    const isAvailable = pool.currentMembers < pool.maxMembers && pool.state === PoolState.Open

    if (isAvailable) {
      return { variant: "default" as const, className: "bg-green-500/20 text-green-400 border-green-500/30", text: "Available" }
    }

    switch (pool.state) {
      case PoolState.Open:
        return { variant: "outline" as const, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", text: "Open" }
      case PoolState.Active:
        return { variant: "secondary" as const, className: "bg-blue-500/20 text-blue-400 border-blue-500/30", text: "Active" }
      case PoolState.Locked:
        return { variant: "outline" as const, className: "bg-purple-500/20 text-purple-400 border-purple-500/30", text: "Locked" }
      case PoolState.Completed:
        return { variant: "secondary" as const, className: "bg-gray-500/20 text-gray-400 border-gray-500/30", text: "Completed" }
      default:
        return { variant: "outline" as const, className: "bg-gray-500/20 text-gray-400 border-gray-500/30", text: "Unknown" }
    }
  }

  const handleJoinPool = (pool: PoolListItem) => {
    // Navigate to pool detail page where user can join
    router.push(`/pool/${pool.address}`)
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
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
              </div>

              <AnimatedHeading
                className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-2"
                lines={["Browse Pools"]}
              />

              <p className="text-white/70">
                Discover and join savings pools from our community.
              </p>
            </div>
          </RevealOnView>

          {/* Search and Filter Section */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mb-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4">Find Pools</h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by pool name or address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-full bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-full sm:w-48 rounded-full bg-neutral-800/50 border-white/20 text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-white/20">
                      <SelectItem value="all" className="text-white hover:bg-neutral-700">All Pools</SelectItem>
                      <SelectItem value="available" className="text-white hover:bg-neutral-700">Available to Join</SelectItem>
                      <SelectItem value="open" className="text-white hover:bg-neutral-700">Open Pools</SelectItem>
                      <SelectItem value="active" className="text-white hover:bg-neutral-700">Active Pools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm">{error.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>{filteredPools.length} pools found</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refetch}
                    disabled={isLoading}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                  </Button>
                </div>
              </div>
            </div>
          </RevealOnView>

          {/* Pools List */}
          {isLoading ? (
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-white/70">Loading pools...</span>
                </div>
              </div>
            </RevealOnView>
          ) : filteredPools.length === 0 ? (
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-8 text-center">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <Users className="h-12 w-12 mx-auto text-white/40 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No pools found</h3>
                  <p className="text-white/60">
                    {searchQuery ? "Try adjusting your search or filter criteria." : "No pools are available at the moment."}
                  </p>
                </div>
              </div>
            </RevealOnView>
          ) : (
            <div className="space-y-4">
              {filteredPools.map((pool, index) => {
                const statusBadge = getPoolStatusBadge(pool)
                const availableSlots = Number(pool.maxMembers - pool.currentMembers)
                const isJoinable = availableSlots > 0 && pool.state === PoolState.Open

                return (
                  <RevealOnView key={pool.address} delay={0.2 + index * 0.05}>
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                      <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                        <DotGridShader />
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">Group Overview</h3>
                          <Badge className={statusBadge.className}>
                            {statusBadge.text}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white mb-2">{pool.name}</h3>

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="h-4 w-4 text-blue-400" />
                              <span className="text-sm text-white/70">Contribution</span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                              {formatEther(pool.contributionAmount)} ETH
                            </p>
                          </div>

                          <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-green-400" />
                              <span className="text-sm text-white/70">Members</span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                              {Number(pool.currentMembers)}/{Number(pool.maxMembers)}
                            </p>
                       
                          </div>

                          <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-white/70">Duration</span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                              {Number(pool.duration) / (24 * 60 * 60)} days
                            </p>
                          </div>

                          <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="h-4 w-4 text-yellow-400" />
                              <span className="text-sm text-white/70">Yield</span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                              {formatEther(pool.yieldGenerated)} ETH
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white/60">
                            <p>Pool Address: {pool.address.slice(0, 10)}...{pool.address.slice(-8)}</p>
                          </div>

                          <Button
                            onClick={() => handleJoinPool(pool)}
                            disabled={!isJoinable}
                            className={`rounded-full px-6 ${isJoinable
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                : "bg-neutral-700 text-white/50 cursor-not-allowed"
                              }`}
                          >
                            {isJoinable ? "View Pool" : "Not Available"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </RevealOnView>
                )
              })}
            </div>
          )}

          {/* Help Section */}
          <RevealOnView delay={0.3}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 mt-6">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4">How to Join a Pool</h3>

                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      1
                    </div>
                    <p>Browse available pools using search and filters</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      2
                    </div>
                    <p>Review pool details including contribution amount and duration</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      3
                    </div>
                    <p>Click &quot;View Pool&quot; to see full details and join</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-semibold mt-0.5">
                      4
                    </div>
                    <p>Connect your wallet and confirm the transaction to join</p>
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
