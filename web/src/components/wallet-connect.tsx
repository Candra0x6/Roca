"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Wallet, 
  Check, 
  AlertCircle, 
  Copy,
  ExternalLink,
  Power
} from "lucide-react"
import { useWalletConnection } from "@/hooks/useWalletConnection"
import { toast } from "sonner"
import { hardhat, sepolia, mainnet } from 'wagmi/chains'

interface WalletConnectProps {
  onConnectionChange?: (connected: boolean, address?: string) => void
}

export default function WalletConnect({ onConnectionChange }: WalletConnectProps) {
  const {
    address,
    isConnected,
    isConnecting,
    balance,
    isBalanceLoading,
    chainId,
    chainInfo,
    connectMetaMask,
    connectWalletConnect,
    connectInjected,
    disconnect,
    switchToNetwork,
    formatAddress,
    error,
  } = useWalletConnection()

  // Notify parent component of connection changes
  React.useEffect(() => {
    onConnectionChange?.(isConnected, address)
  }, [isConnected, address, onConnectionChange])

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      toast.success("Address copied to clipboard")
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success("Wallet disconnected")
  }

  const openInExplorer = () => {
    if (!address) return
    
    let explorerUrl = ''
    switch (chainId) {
      case hardhat.id:
        toast.error("Hardhat local network doesn't have a block explorer")
        return
      case sepolia.id:
        explorerUrl = `https://sepolia.etherscan.io/address/${address}`
        break
      case mainnet.id:
        explorerUrl = `https://etherscan.io/address/${address}`
        break
      default:
        toast.error("Block explorer not available for this network")
        return
    }
    
    window.open(explorerUrl, '_blank')
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button
          onClick={connectMetaMask}
          size="sm"
          variant="outline"
          className="rounded-full border-white/20 text-white/70 hover:bg-white/10 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  // Show connected state
  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* Network Badge */}
          <Badge 
            variant="outline" 
            className="border-white/20 text-white/70"
          >
            <div 
              className="w-2 h-2 rounded-full mr-2" 
              style={{ backgroundColor: chainInfo.color }}
            />
            {chainInfo.shortName}
          </Badge>

          {/* Address Display */}
          <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm text-green-400">
            <Check className="h-4 w-4" />
            <span className="font-medium">{formatAddress(address)}</span>
          </div>
        </div>

        {/* Balance and Actions */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">
            Balance: {isBalanceLoading ? "..." : `${parseFloat(balance).toFixed(4)} ETH`}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={copyAddress}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs border-white/20 text-white/70 hover:bg-white/10"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              onClick={openInExplorer}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs border-white/20 text-white/70 hover:bg-white/10"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleDisconnect}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <Power className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show connection options
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Button
          onClick={connectMetaMask}
          disabled={isConnecting}
          size="lg"
          className="rounded-full bg-orange-600 hover:bg-orange-700"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
        
        <Button
          onClick={connectWalletConnect}
          disabled={isConnecting}
          size="lg"
          variant="outline"
          className="rounded-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "WalletConnect"}
        </Button>
        
        <Button
          onClick={connectInjected}
          disabled={isConnecting}
          size="lg"
          variant="outline"
          className="rounded-full border-white/20 text-white/70 hover:bg-white/10"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Other Wallets"}
        </Button>
      </div>

      <p className="text-xs text-white/50 text-center">
        Connect your wallet to interact with Roca pools
      </p>
    </div>
  )
}
