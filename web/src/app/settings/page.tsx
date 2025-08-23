"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  User,
  Bell,
  Wallet,
  Save,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import { useNotifications } from "@/components/notifications/notification-provider"

interface UserSettings {
  displayName: string
  notificationMethods: {
    inApp: boolean
    email: boolean
    telegram: boolean
  }
  emailAddress: string
  telegramUsername: string
}

interface WalletInfo {
  address: string
  balance: string
  network: string
  connected: boolean
}

export default function Settings() {
  const { addNotification } = useNotifications()
  const [userAddress] = useState<string>("0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c")
  const [settings, setSettings] = useState<UserSettings>({
    displayName: "",
    notificationMethods: {
      inApp: true,
      email: false,
      telegram: false,
    },
    emailAddress: "",
    telegramUsername: "",
  })
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
    balance: "2.45 ETH",
    network: "Ethereum Mainnet",
    connected: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFullAddress, setShowFullAddress] = useState(false)

  useEffect(() => {
    // Simulate fetching user settings
    setTimeout(() => {
      setSettings({
        displayName: "Alpha Trader",
        notificationMethods: {
          inApp: true,
          email: true,
          telegram: false,
        },
        emailAddress: "user@example.com",
        telegramUsername: "@alphatrader",
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    addNotification({
      type: "success",
      title: "Settings Saved",
      message: "Your preferences have been updated successfully.",
    })

    setIsSaving(false)
  }

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletInfo.address)
    setCopied(true)
    addNotification({
      type: "success",
      title: "Address Copied",
      message: "Wallet address copied to clipboard.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAddress = (address: string) => {
    if (showFullAddress) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const updateNotificationMethod = (method: keyof UserSettings["notificationMethods"], enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notificationMethods: {
        ...prev.notificationMethods,
        [method]: enabled,
      },
    }))
  }

  if (isLoading) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen">
        <div className=" pt-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 animate-pulse"
                >
                  <div className="h-6 bg-white/10 rounded mb-4"></div>
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen">
      <div className="px-4 pt-4 pb-16">
        <div className="max-w-4xl mx-auto">
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
                    lines={["Settings & Profile"]}
                  />
                  <p className="text-white/70 mt-1">Customize your experience and preferences</p>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </RevealOnView>

          <div className="space-y-6">
            {/* Profile Section */}
            <RevealOnView delay={0.1}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-bold">Profile Information</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) => setSettings((prev) => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Enter your display name"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      />
                      <p className="text-xs text-white/50 mt-1">
                        This name will be displayed instead of your wallet address in groups
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnView>

            {/* Notification Preferences */}
            <RevealOnView delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-bold">Notification Preferences</h2>
                  </div>

                  <div className="space-y-4">
                    {/* In-App Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-white/70" />
                        <div>
                          <h3 className="font-medium">In-App Notifications</h3>
                          <p className="text-sm text-white/50">Receive notifications within the application</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotificationMethod("inApp", !settings.notificationMethods.inApp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notificationMethods.inApp ? "bg-blue-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notificationMethods.inApp ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-white/70" />
                        <div>
                          <h3 className="font-medium">Email Notifications</h3>
                          <p className="text-sm text-white/50">Receive notifications via email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotificationMethod("email", !settings.notificationMethods.email)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notificationMethods.email ? "bg-blue-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notificationMethods.email ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Email Address Input */}
                    {settings.notificationMethods.email && (
                      <div className="ml-8">
                        <input
                          type="email"
                          value={settings.emailAddress}
                          onChange={(e) => setSettings((prev) => ({ ...prev, emailAddress: e.target.value }))}
                          placeholder="Enter your email address"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                      </div>
                    )}

                    {/* Telegram Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-white/70" />
                        <div>
                          <h3 className="font-medium">Telegram Notifications</h3>
                          <p className="text-sm text-white/50">Receive notifications via Telegram bot</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotificationMethod("telegram", !settings.notificationMethods.telegram)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notificationMethods.telegram ? "bg-blue-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notificationMethods.telegram ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Telegram Username Input */}
                    {settings.notificationMethods.telegram && (
                      <div className="ml-8">
                        <input
                          type="text"
                          value={settings.telegramUsername}
                          onChange={(e) => setSettings((prev) => ({ ...prev, telegramUsername: e.target.value }))}
                          placeholder="@username"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RevealOnView>

            {/* Wallet Details */}
            <RevealOnView delay={0.3}>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-bold">Wallet Details</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Connection Status */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <h3 className="font-medium">Connection Status</h3>
                        <p className="text-sm text-white/50">Current wallet connection state</p>
                      </div>
                      <Badge
                        className={`${walletInfo.connected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
                      >
                        {walletInfo.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>

                    {/* Wallet Address */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Wallet Address</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowFullAddress(!showFullAddress)}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            {showFullAddress ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={handleCopyAddress}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-sm text-white/70 break-all">{formatAddress(walletInfo.address)}</p>
                    </div>

                    {/* Balance */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="font-medium mb-2">Balance</h3>
                      <p className="text-2xl font-bold text-blue-400">{walletInfo.balance}</p>
                    </div>

                    {/* Network */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="font-medium mb-2">Network</h3>
                      <p className="text-white/70">{walletInfo.network}</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnView>
          </div>
        </div>
      </div>
    </main>
  )
}
