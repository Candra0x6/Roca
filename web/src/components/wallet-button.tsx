"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Wallet, 
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  AlertCircle
} from "lucide-react"
import { useWalletConnection } from "@/hooks/useWalletConnection"
import { toast } from "sonner"
import { hardhat, sepolia, mainnet } from 'wagmi/chains'
import { useNativeToken } from '@/hooks/useNativeToken'

interface WalletButtonProps {
  onConnectionChange?: (connected: boolean, address?: string) => void
}

export default function WalletButton({ onConnectionChange }: WalletButtonProps) {
  const {
    address,
    isConnected,
    isConnecting,
    balance,
    isBalanceLoading,
    chainId,
    chainInfo,
    connectMetaMask,
    disconnect,
    formatAddress,
    error,
  } = useWalletConnection()
  
  const { symbol: nativeTokenSymbol } = useNativeToken()

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
      <Button
        onClick={connectMetaMask}
        variant="outline"
        className="flex items-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10"
      >
        <AlertCircle className="h-4 w-4" />
        <span>Try Again</span>
      </Button>
    )
  }

  // Show connected state with dropdown
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-green-500/10 border-green-500/20 text-green-400 hover:text-white hover:bg-green-500/20"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: chainInfo.color }}
              />
              <span className="font-medium">{formatAddress(address)}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-5">
          <div className="">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Network</span>
              <Badge variant="outline" className="text-xs">
                {chainInfo.name}
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className="text-sm font-mono">
                {isBalanceLoading ? "..." : `${parseFloat(balance).toFixed(4)} ${nativeTokenSymbol}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <span className="text-sm font-mono">{formatAddress(address)}</span>
            </div>
          </div>
          <DropdownMenuSeparator className="mt-1" />
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openInExplorer} className="cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDisconnect} 
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Show connect button
  return (
    <Button
      onClick={connectMetaMask}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      <Wallet className="h-4 w-4" />
      <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
    </Button>
  )
}
