"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, DollarSign, Users, Copy, CheckCircle, AlertCircle, Loader2, Clock, Gift } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"

interface TokenBalance {
  symbol: string
  balance: string
  decimals: number
}

interface CreatePoolForm {
  poolName: string
  contributionAmount: string
  selectedToken: string
  poolSize: string
  duration: string
  bonusPrizeSource: string
}

export default function CreatePool() {
  const [userAddress] = useState<string>("0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c")
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createdPool, setCreatedPool] = useState<{ id: string; inviteLink: string } | null>(null)
  const [formData, setFormData] = useState<CreatePoolForm>({
    poolName: "",
    contributionAmount: "",
    selectedToken: "",
    poolSize: "",
    duration: "",
    bonusPrizeSource: "",
  })
  const [errors, setErrors] = useState<Partial<CreatePoolForm>>({})

  useEffect(() => {
    // Simulate fetching token balances
    console.log("[v0] Fetching token balances for user:", userAddress)

    setTimeout(() => {
      const mockBalances: TokenBalance[] = [
        { symbol: "SOL", balance: "12.45", decimals: 9 },
        { symbol: "USDC", balance: "2,850.00", decimals: 6 },
        { symbol: "ETH", balance: "1.8", decimals: 18 },
      ]
      setTokenBalances(mockBalances)
      setIsLoadingBalances(false)
    }, 1000)
  }, [userAddress])

  const validateForm = (): boolean => {
    const newErrors: Partial<CreatePoolForm> = {}

    if (!formData.poolName.trim()) {
      newErrors.poolName = "Pool name is required"
    }

    if (!formData.contributionAmount || Number.parseFloat(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = "Valid contribution amount is required"
    } else if (Number.parseFloat(formData.contributionAmount) < 0.1) {
      newErrors.contributionAmount = "Minimum contribution is 0.1"
    } else if (Number.parseFloat(formData.contributionAmount) > 100) {
      newErrors.contributionAmount = "Maximum contribution is 100"
    }

    if (!formData.selectedToken) {
      newErrors.selectedToken = "Please select a token"
    }

    if (!formData.poolSize || Number.parseInt(formData.poolSize) < 5 || Number.parseInt(formData.poolSize) > 100) {
      newErrors.poolSize = "Pool size must be between 5 and 100 members"
    }

    if (!formData.duration) {
      newErrors.duration = "Please select a duration"
    }

    if (!formData.bonusPrizeSource) {
      newErrors.bonusPrizeSource = "Please select a bonus prize source"
    }

    // Check if user has sufficient balance for initial deposit
    if (formData.selectedToken && formData.contributionAmount) {
      const selectedTokenBalance = tokenBalances.find((t) => t.symbol === formData.selectedToken)
      if (
        selectedTokenBalance &&
        Number.parseFloat(formData.contributionAmount) >
          Number.parseFloat(selectedTokenBalance.balance.replace(/,/g, ""))
      ) {
        newErrors.contributionAmount = "Insufficient balance for initial deposit"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePool = async () => {
    if (!validateForm()) return

    setIsCreating(true)
    console.log("[v0] Creating pool with data:", formData)

    try {
      // Simulate smart contract call
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const poolId = `pool-${Date.now()}`
      const inviteLink = `https://rosca-app.com/join-pool/${poolId}`

      setCreatedPool({ id: poolId, inviteLink })
      console.log("[v0] Pool created successfully:", poolId)
    } catch (error) {
      console.error("[v0] Error creating pool:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const copyInviteLink = () => {
    if (createdPool) {
      navigator.clipboard.writeText(createdPool.inviteLink)
      console.log("[v0] Invite link copied to clipboard")
    }
  }

  const resetForm = () => {
    setCreatedPool(null)
    setFormData({
      poolName: "",
      contributionAmount: "",
      selectedToken: "",
      poolSize: "",
      duration: "",
      bonusPrizeSource: "",
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

                <div className="bg-neutral-800/50 rounded-2xl p-6 mb-8">
                  <Label className="text-sm font-medium text-white/70 mb-2 block">Pool Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdPool.inviteLink}
                      readOnly
                      className="bg-neutral-700/50 border-white/20 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={copyInviteLink}
                      variant="outline"
                      className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent px-4"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

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
        <div className="max-w-2xl mx-auto">
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
                  className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
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
                    {isLoadingBalances ? (
                      <div className="h-10 bg-neutral-800/50 border border-white/20 rounded-md flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                      </div>
                    ) : (
                      <Select
                        value={formData.selectedToken}
                        onValueChange={(value) => setFormData({ ...formData, selectedToken: value })}
                      >
                        <SelectTrigger className="bg-neutral-800/50 border-white/20 text-white">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-white/20">
                          {tokenBalances.map((token) => (
                            <SelectItem
                              key={token.symbol}
                              value={token.symbol}
                              className="text-white hover:bg-neutral-700"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>{token.symbol}</span>
                                <span className="text-white/70 text-sm ml-4">Balance: {token.balance}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {errors.selectedToken && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.selectedToken}
                      </p>
                    )}
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
                      min="5"
                      max="100"
                      placeholder="20"
                      value={formData.poolSize}
                      onChange={(e) => setFormData({ ...formData, poolSize: e.target.value })}
                      className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50"
                    />
                    <p className="text-xs text-white/50">Min: 5 | Max: 100 members</p>
                    {errors.poolSize && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.poolSize}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Duration
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger className="bg-neutral-800/50 border-white/20 text-white">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/20">
                        <SelectItem value="3months" className="text-white hover:bg-neutral-700">
                          3 Months
                        </SelectItem>
                        <SelectItem value="6months" className="text-white hover:bg-neutral-700">
                          6 Months
                        </SelectItem>
                        <SelectItem value="12months" className="text-white hover:bg-neutral-700">
                          12 Months
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

                {/* Weekly Bonus Prize Source */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    <Gift className="inline h-4 w-4 mr-1" />
                    Weekly Bonus Prize Source
                  </Label>
                  <Select
                    value={formData.bonusPrizeSource}
                    onValueChange={(value) => setFormData({ ...formData, bonusPrizeSource: value })}
                  >
                    <SelectTrigger className="bg-neutral-800/50 border-white/20 text-white">
                      <SelectValue placeholder="Select bonus prize source" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-white/20">
                      <SelectItem value="staking-yield" className="text-white hover:bg-neutral-700">
                        <div className="flex flex-col items-start">
                          <span>From Staking Yield</span>
                          <span className="text-xs text-white/60">Uses portion of generated yield for prizes</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="sponsor-external" className="text-white hover:bg-neutral-700">
                        <div className="flex flex-col items-start">
                          <span>Sponsor/External Prize</span>
                          <span className="text-xs text-white/60">External funding for bonus prizes</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.bonusPrizeSource && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.bonusPrizeSource}
                    </p>
                  )}
                </div>

                {/* Pool Summary */}
                {formData.contributionAmount && formData.selectedToken && formData.poolSize && formData.duration && (
                  <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                    <h4 className="font-semibold text-white mb-2">Pool Summary</h4>
                    <div className="text-sm text-white/70 space-y-1">
                      <p>
                        • Total pool size:{" "}
                        {(Number.parseFloat(formData.contributionAmount) * Number.parseInt(formData.poolSize)).toFixed(
                          2,
                        )}{" "}
                        {formData.selectedToken}
                      </p>
                      <p>• Duration: {formData.duration.replace("months", " months")}</p>
                      <p>• Expected APY: ~5-8% (via Marinade staking)</p>
                      <p>
                        • Weekly bonus prizes:{" "}
                        {formData.bonusPrizeSource === "staking-yield" ? "From yield" : "External sponsor"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Create Button */}
                <Button
                  onClick={handleCreatePool}
                  disabled={isCreating || isLoadingBalances}
                  className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12"
                >
                  {isCreating ? (
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
              </div>
            </div>
          </RevealOnView>
        </div>
      </div>
    </main>
  )
}
