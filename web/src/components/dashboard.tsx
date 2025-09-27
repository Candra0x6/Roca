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
import { formatEther } from "viem"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { useDashboard } from "@/hooks/useDashboard"
import { useWalletConnection } from "@/hooks/useWalletConnection"
import { PoolState } from "@/contracts/types"
import { useNativeToken } from "@/hooks/useNativeToken"

export default function Dashboard() {

  const { disconnect, chainInfo } = useWalletConnection()
    const nativeTokenSymbol = chainInfo?.nativeCurrency.symbol || "ETH"
  const {
    userAddress,
    isConnected,
    activePools,
    completedPools,
    allPools,
    stats,
    userBadges,
    isLoading,
    error,
    refresh: refreshData,
  } = useDashboard()
  console.log(activePools)
  const handleDisconnect = () => {
    console.log("[Dashboard] Disconnecting wallet")
    disconnect()
    window.location.href = "/"
  }

  const getStatusIcon = (state: PoolState) => {
    switch (state) {
      case PoolState.Active:
      case PoolState.Locked:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case PoolState.Completed:
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case PoolState.Open:
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (state: PoolState) => {
    switch (state) {
      case PoolState.Active:
      case PoolState.Locked:
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case PoolState.Completed:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case PoolState.Open:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusText = (state: PoolState) => {
    switch (state) {
      case PoolState.Open:
        return "Open"
      case PoolState.Locked:
        return "Locked"
      case PoolState.Active:
        return "Active"
      case PoolState.Completed:
        return "Completed"
      default:
        return "Unknown"
    }
  }

  const formatTimeRemaining = (timeRemaining?: bigint) => {
    if (!timeRemaining || timeRemaining === 0n) return "Completed"
    
    const seconds = Number(timeRemaining)
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return "< 1h remaining"
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
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>

                <div>
                  <AnimatedHeading
                    className="text-2xl sm:text-3xl font-black leading-tight tracking-tight"
                    lines={["Dashboard"]}
                  />
                  <p className="text-white/70 mt-1">
                    Connected: <span className="font-mono text-sm">{userAddress || "Not connected"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/create-pool">
                  <Button        variant="outline"
                    size="sm"
                    className="rounded-xl border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white w-full py-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pool
                  </Button>
                </Link>

              
              </div>
            </div>
          </RevealOnView>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <RevealOnView delay={0.1}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white/80">Total Pools</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{stats?.activePoolsCount + stats?.completedPoolsCount || 0}</div>
                  <div className="text-sm text-white/50 mt-1">Pools joined</div>
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
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <h3 className="font-semibold text-white/80">Total Contributed</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{formatEther(stats?.totalContributions || 0n)} {nativeTokenSymbol}</div>
                  <div className="text-sm text-white/50 mt-1">Across all pools</div>
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
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white/80">Yield Earned</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{formatEther(stats?.totalYieldEarned || 0n)} {nativeTokenSymbol}</div>
                  <div className="text-sm text-white/50 mt-1">Total rewards</div>
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
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <h3 className="font-semibold text-white/80">NFT Badges</h3>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{stats?.totalBadges || 0}</div>
                  <div className="text-sm text-white/50 mt-1">Achievements</div>
                </div>
              </div>
            </RevealOnView>
          </div>

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
          ) : error ? (
            <div className="text-center py-16">
              <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-red-900/20 p-12">
                <div className="relative z-10">
                  <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2 text-red-400">Error Loading Dashboard</h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    {error || "Failed to load dashboard data. Please try again."}
                  </p>
                  <Button 
                    onClick={refreshData}
                    className="rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allPools.map((pool, idx) => (
                <RevealOnView key={pool.address} delay={idx * 0.08}>
                  <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 hover:bg-neutral-900/80 transition-colors">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10 flex-1">
                      {/* Pool Header */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">{pool.name}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(pool.state)}
                          <Badge className={`text-xs ${getStatusColor(pool.state)}`}>
                            {getStatusText(pool.state)}
                          </Badge>
                        </div>
                      </div>

                      {/* Pool Info */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-white/70">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">
                            {formatEther(pool.contributionAmount)} {nativeTokenSymbol} contribution
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {Number(pool.currentMembers)} / {Number(pool.maxMembers)} members
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/70">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {formatTimeRemaining(pool.timeRemaining)}
                          </span>
                        </div>

                        {pool.yieldEarned > 0n && (
                          <div className="flex items-center gap-2 text-white/70">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Yield: {formatEther(pool.yieldEarned)} {nativeTokenSymbol}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>Pool Progress</span>
                          <span>{Math.round(pool.progress)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${pool.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="relative z-10">
                      <Link href={`/pool/${pool.address}`}>
                        <Button
                          variant="outline"
                          className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white"
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

          {/* Empty State */}
          {!isLoading && !error && allPools.length === 0 && (
            <RevealOnView className="text-center">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-12">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Pools Yet</h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    You haven&lsquo;t joined any pools yet. Create your first pool or join an existing one to get
                    started.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/create-pool">
                      <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Pool
                      </Button>
                    </Link>
                    <Link href="/pools">
                      <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white">
                        Browse Pools
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </RevealOnView>
          )}
        </div>
      </div>
    </main>
  )
}
