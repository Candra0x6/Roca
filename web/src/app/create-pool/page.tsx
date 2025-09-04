"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, DollarSign, Users, Copy, CheckCircle, AlertCircle, Loader2, Clock, Gift } from "lucide-react"
import Link from "next/link"
import { useAccount, useBalance } from "wagmi"
import { parseEther, formatEther } from "viem"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { useCreatePool } from "@/hooks/usePoolFactory"

interface CreatePoolForm {
  poolName: string
  contributionAmount: string
  poolSize: string
  duration: string
}

export default function CreatePool() {
  const { address: userAddress, isConnected } = useAccount()
  const { data: ethBalance } = useBalance({
    address: userAddress,
  })

  // Smart contract hooks
  const { createPool, isLoading: isCreatingPool, isSuccess, error: contractError, hash } = useCreatePool()

  const [formData, setFormData] = useState<CreatePoolForm>({
    poolName: "",
    contributionAmount: "",
    poolSize: "",
    duration: "",
  })
  const [errors, setErrors] = useState<Partial<CreatePoolForm>>({})
  const [createdPool, setCreatedPool] = useState<{ id: string; inviteLink: string; hash: string } | null>(null)

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash) {
      const poolId = `pool-${hash.slice(0, 8)}`
      const inviteLink = `${window.location.origin}/join-pool/${poolId}`
      setCreatedPool({ id: poolId, inviteLink, hash })
    }
  }, [isSuccess, hash])

  const validateForm = (): boolean => {
    const newErrors: Partial<CreatePoolForm> = {}

    if (!formData.poolName.trim()) {
      newErrors.poolName = "Pool name is required"
    }

    if (!formData.contributionAmount || Number.parseFloat(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = "Valid contribution amount is required"
    } else if (Number.parseFloat(formData.contributionAmount) < 0.01) {
      newErrors.contributionAmount = "Minimum contribution is 0.01 ETH"
    } else if (Number.parseFloat(formData.contributionAmount) > 100) {
      newErrors.contributionAmount = "Maximum contribution is 100 ETH"
    }

    if (!formData.poolSize || Number.parseInt(formData.poolSize) < 2 || Number.parseInt(formData.poolSize) > 100) {
      newErrors.poolSize = "Pool size must be between 2 and 100 members"
    }

    if (!formData.duration) {
      newErrors.duration = "Please select a duration"
    }

    // Check if user has sufficient ETH balance
    if (formData.contributionAmount && ethBalance) {
      const contributionInWei = parseEther(formData.contributionAmount)
      if (contributionInWei > ethBalance.value) {
        newErrors.contributionAmount = "Insufficient ETH balance"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getDurationInSeconds = (duration: string): number => {
    switch (duration) {
      case "7-days": return 7 * 24 * 60 * 60
      case "14-days": return 14 * 24 * 60 * 60
      case "30-days": return 30 * 24 * 60 * 60
      case "90-days": return 90 * 24 * 60 * 60
      default: return 30 * 24 * 60 * 60
    }
  }

  const handleCreatePool = async () => {
    if (!isConnected) {
      console.error("Wallet not connected")
      return
    }

    if (!validateForm()) return

    try {
      console.log("[CreatePool] Creating pool with data:", formData)

      await createPool({
        name: formData.poolName,
        contributionAmount: formData.contributionAmount,
        maxMembers: Number.parseInt(formData.poolSize),
        duration: getDurationInSeconds(formData.duration),
      })
    } catch (error) {
      console.error("[CreatePool] Error creating pool:", error)
    }
  }

  const copyInviteLink = () => {
    if (createdPool) {
      navigator.clipboard.writeText(createdPool.inviteLink)
      console.log("[CreatePool] Invite link copied to clipboard")
    }
  }

  const resetForm = () => {
    setCreatedPool(null)
    setFormData({
      poolName: "",
      contributionAmount: "",
      poolSize: "",
      duration: "",
    })
    setErrors({})
  }

  if (createdPool) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen">
        <div className="pt-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <RevealOnView
              as="div"
              intensity="hero"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-8 text-center"
            >
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>

                <AnimatedHeading
                  className="text-3xl font-black leading-tight tracking-tight mb-4"
                  lines={["Pool Created Successfully!"]}
                />

                <p className="text-white/70 mb-8">
                  Your staking pool has been created and deployed to the blockchain. Share the invite link below to add
                  members and start earning yield together.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard">
                    <Button className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                      View My Pools
                    </Button>
                  </Link>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    Create Another Pool
                  </Button>
                </div>
              </div>
            </RevealOnView>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="px-4 pt-4 pb-16">
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

            <div className="relative z-10 flex items-center gap-4">
              <Link href="/dashboard">
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
                  lines={["Create New Pool"]}
                />
                <p className="text-white/70 mt-1">Launch a staking pool with yield distribution and weekly bonuses</p>
              </div>
            </div>
          </RevealOnView>

          {/* Create Pool Form */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10 space-y-6">
                {/* Pool Name */}
                <div className="space-y-2">
                  <Label htmlFor="poolName" className="text-sm font-medium text-white">
                    Pool Name
                  </Label>
                  <Input
                    id="poolName"
                    placeholder="e.g., Diamond Stakers Pool"
                    value={formData.poolName}
                    onChange={(e) => setFormData({ ...formData, poolName: e.target.value })}
                    className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50"
                  />
                  {errors.poolName && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.poolName}
                    </p>
                  )}
                </div>

                {/* Contribution Amount & Token */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contributionAmount" className="text-sm font-medium text-white">
                      Contribution Amount per Member
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        id="contributionAmount"
                        type="number"
                        step="0.1"
                        placeholder="1.0"
                        value={formData.contributionAmount}
                        onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                        className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50 pl-10"
                      />
                    </div>
                    <p className="text-xs text-white/50">Min: 0.1 | Max: 100</p>
                    {errors.contributionAmount && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.contributionAmount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">Token</Label>
                    <div className="h-10 bg-neutral-800/50 border border-white/20 rounded-md flex items-center px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">ETH</span>
                        {ethBalance && (
                          <span className="text-white/70 text-sm">
                            Balance: {Number(formatEther(ethBalance.value)).toFixed(4)} ETH
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/50">Pool contributions are in ETH</p>
                  </div>
                </div>

                {/* Pool Size & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poolSize" className="text-sm font-medium text-white">
                      <Users className="inline h-4 w-4 mr-1" />
                      Pool Size (Max Members)
                    </Label>
                    <Input
                      id="poolSize"
                      type="number"
                      min="2"
                      max="100"
                      placeholder="10"
                      value={formData.poolSize}
                      onChange={(e) => setFormData({ ...formData, poolSize: e.target.value })}
                      className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50 w-full"
                    />
                    <p className="text-xs text-white/50">Min: 2 | Max: 100 members</p>
                    {errors.poolSize && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.poolSize}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label className="text-sm font-medium text-white">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Duration
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger className="bg-neutral-800/50 border-white/20 text-white w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/20">
                        <SelectItem value="7-days" className="text-white hover:bg-neutral-700">
                          7 Days
                        </SelectItem>
                        <SelectItem value="14-days" className="text-white hover:bg-neutral-700">
                          14 Days
                        </SelectItem>
                        <SelectItem value="30-days" className="text-white hover:bg-neutral-700">
                          30 Days
                        </SelectItem>
                        <SelectItem value="90-days" className="text-white hover:bg-neutral-700">
                          90 Days
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.duration && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.duration}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pool Summary */}
                {formData.contributionAmount && formData.poolSize && formData.duration && (
                  <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                    <h4 className="font-semibold text-white mb-2">Pool Summary</h4>
                    <div className="text-sm text-white/70 space-y-1">
                      <p>
                        • Total pool size:{" "}
                        {(Number.parseFloat(formData.contributionAmount) * Number.parseInt(formData.poolSize)).toFixed(
                          4,
                        )}{" "}
                        ETH
                      </p>
                      <p>• Duration: {formData.duration.replace("-", " ").replace("days", " days")}</p>
                      <p>• Expected APY: ~5% (via yield staking)</p>
                      <p>• Weekly lottery prizes: Funded from pool yield</p>
                    </div>
                  </div>
                )}

                {/* Create Button */}
                <div className="space-y-3">
                  {contractError && (
                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {contractError}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleCreatePool}
                    disabled={isCreatingPool || !isConnected}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/20 text-white hover:bg-white/10 bg-transparent hover:text-white w-full py-5"
                  >
                    {isCreatingPool ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Pool...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Pool
                      </>
                    )}
                  </Button>

                  {!isConnected && (
                    <p className="text-yellow-400 text-sm text-center flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Please connect your wallet to create a pool
                    </p>
                  )}
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      </div>
    </main>
  )
}
