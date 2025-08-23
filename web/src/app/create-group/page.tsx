"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, DollarSign, Users, Calendar, Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
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

interface CreateGroupForm {
  groupName: string
  contributionAmount: string
  selectedToken: string
  frequency: string
  maxMembers: string
}

export default function CreateGroup() {
  const [userAddress] = useState<string>("0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c")
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createdGroup, setCreatedGroup] = useState<{ id: string; inviteLink: string } | null>(null)
  const [formData, setFormData] = useState<CreateGroupForm>({
    groupName: "",
    contributionAmount: "",
    selectedToken: "",
    frequency: "",
    maxMembers: "",
  })
  const [errors, setErrors] = useState<Partial<CreateGroupForm>>({})

  useEffect(() => {
    // Simulate fetching token balances
    console.log("[v0] Fetching token balances for user:", userAddress)

    setTimeout(() => {
      const mockBalances: TokenBalance[] = [
        { symbol: "ETH", balance: "2.45", decimals: 18 },
        { symbol: "USDC", balance: "1,250.00", decimals: 6 },
        { symbol: "ICP", balance: "45.8", decimals: 8 },
      ]
      setTokenBalances(mockBalances)
      setIsLoadingBalances(false)
    }, 1000)
  }, [userAddress])

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateGroupForm> = {}

    if (!formData.groupName.trim()) {
      newErrors.groupName = "Group name is required"
    }

    if (!formData.contributionAmount || Number.parseFloat(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = "Valid contribution amount is required"
    }

    if (!formData.selectedToken) {
      newErrors.selectedToken = "Please select a token"
    }

    if (!formData.frequency) {
      newErrors.frequency = "Please select a frequency"
    }

    if (!formData.maxMembers || Number.parseInt(formData.maxMembers) < 2 || Number.parseInt(formData.maxMembers) > 50) {
      newErrors.maxMembers = "Max members must be between 2 and 50"
    }

    // Check if user has sufficient balance
    if (formData.selectedToken && formData.contributionAmount) {
      const selectedTokenBalance = tokenBalances.find((t) => t.symbol === formData.selectedToken)
      if (
        selectedTokenBalance &&
        Number.parseFloat(formData.contributionAmount) >
          Number.parseFloat(selectedTokenBalance.balance.replace(/,/g, ""))
      ) {
        newErrors.contributionAmount = "Insufficient balance"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateGroup = async () => {
    if (!validateForm()) return

    setIsCreating(true)
    console.log("[v0] Creating group with data:", formData)

    try {
      // Simulate smart contract call
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const groupId = `group-${Date.now()}`
      const inviteLink = `https://rosca-app.com/join/${groupId}`

      setCreatedGroup({ id: groupId, inviteLink })
      console.log("[v0] Group created successfully:", groupId)
    } catch (error) {
      console.error("[v0] Error creating group:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const copyInviteLink = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.inviteLink)
      console.log("[v0] Invite link copied to clipboard")
    }
  }

  const resetForm = () => {
    setCreatedGroup(null)
    setFormData({
      groupName: "",
      contributionAmount: "",
      selectedToken: "",
      frequency: "",
      maxMembers: "",
    })
    setErrors({})
  }

  if (createdGroup) {
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
                  lines={["Group Created Successfully!"]}
                />

                <p className="text-white/70 mb-8">
                  Your ROSCA group has been created and deployed to the blockchain. Share the invite link below to add
                  members.
                </p>

                <div className="bg-neutral-800/50 rounded-2xl p-6 mb-8">
                  <Label className="text-sm font-medium text-white/70 mb-2 block">Group Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdGroup.inviteLink}
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
                      View My Groups
                    </Button>
                  </Link>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    Create Another Group
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
                  lines={["Create New Group"]}
                />
                <p className="text-white/70 mt-1">Set up a new ROSCA group for your community</p>
              </div>
            </div>
          </RevealOnView>

          {/* Create Group Form */}
          <RevealOnView delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                <DotGridShader />
              </div>

              <div className="relative z-10 space-y-6">
                {/* Group Name */}
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-sm font-medium text-white">
                    Group Name
                  </Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Alpha Savers Circle"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50"
                  />
                  {errors.groupName && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.groupName}
                    </p>
                  )}
                </div>

                {/* Contribution Amount & Token */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contributionAmount" className="text-sm font-medium text-white">
                      Contribution Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        id="contributionAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.contributionAmount}
                        onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                        className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50 pl-10"
                      />
                    </div>
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

                {/* Frequency & Max Members */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Frequency
                    </Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    >
                      <SelectTrigger className="bg-neutral-800/50 border-white/20 text-white">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/20">
                        <SelectItem value="Daily" className="text-white hover:bg-neutral-700">
                          Daily
                        </SelectItem>
                        <SelectItem value="Weekly" className="text-white hover:bg-neutral-700">
                          Weekly
                        </SelectItem>
                        <SelectItem value="Monthly" className="text-white hover:bg-neutral-700">
                          Monthly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.frequency}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxMembers" className="text-sm font-medium text-white">
                      <Users className="inline h-4 w-4 mr-1" />
                      Max Members
                    </Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max="50"
                      placeholder="12"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                      className="bg-neutral-800/50 border-white/20 text-white placeholder:text-white/50"
                    />
                    {errors.maxMembers && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.maxMembers}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {formData.contributionAmount && formData.selectedToken && formData.frequency && formData.maxMembers && (
                  <div className="bg-neutral-800/30 rounded-2xl p-4 border border-white/10">
                    <h4 className="font-semibold text-white mb-2">Group Summary</h4>
                    <div className="text-sm text-white/70 space-y-1">
                      <p>
                        • Each member contributes {formData.contributionAmount} {formData.selectedToken}{" "}
                        {formData.frequency.toLowerCase()}
                      </p>
                      <p>
                        • Total pool per round:{" "}
                        {(
                          Number.parseFloat(formData.contributionAmount) * Number.parseInt(formData.maxMembers)
                        ).toFixed(2)}{" "}
                        {formData.selectedToken}
                      </p>
                      <p>• Group will run for {formData.maxMembers} rounds</p>
                    </div>
                  </div>
                )}

                {/* Create Button */}
                <Button
                  onClick={handleCreateGroup}
                  disabled={isCreating || isLoadingBalances}
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 h-12"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Group...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
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
