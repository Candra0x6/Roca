"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, Check, AlertCircle } from "lucide-react"

type WalletStatus = "disconnected" | "connecting" | "connected" | "error"

interface WalletConnectProps {
  onConnectionChange?: (connected: boolean, address?: string) => void
}

export default function WalletConnect({ onConnectionChange }: WalletConnectProps) {
  const [status, setStatus] = useState<WalletStatus>("disconnected")
  const [address, setAddress] = useState<string>("")
  const [error, setError] = useState<string>("")

  // Mock wallet connection - replace with actual wallet integration
  const connectWallet = async () => {
    setStatus("connecting")
    setError("")

    try {
      // Simulate wallet connection delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock successful connection
      const mockAddress = "0x1234...5678"
      setAddress(mockAddress)
      setStatus("connected")
      onConnectionChange?.(true, mockAddress)
    } catch (err) {
      setError("Failed to connect wallet")
      setStatus("error")
      onConnectionChange?.(false)
    }
  }

  const disconnectWallet = () => {
    setAddress("")
    setStatus("disconnected")
    setError("")
    onConnectionChange?.(false)
  }

  if (status === "connected") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm text-green-400">
          <Check className="h-4 w-4" />
          <span className="font-medium">{address}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnectWallet}
          className="rounded-full border-white/20 text-white/70 hover:bg-white/10 bg-transparent"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={connectWallet}
        disabled={status === "connecting"}
        size="lg"
        className="rounded-full bg-blue-600 hover:bg-blue-700"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {status === "connecting" ? "Connecting..." : "Connect Wallet"}
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="text-xs text-white/50">Supports Metamask, WalletConnect & Internet Identity</p>
    </div>
  )
}
