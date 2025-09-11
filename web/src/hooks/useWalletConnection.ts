import { useAccount, useBalance, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { sepolia, mainnet, hardhat } from 'wagmi/chains'

// Somnia testnet chain definition (matching wagmi.ts)
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
} as const

export function useWalletConnection() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount()
  const { connect, connectors, error: connectError, isPending: isConnectPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Get balance for the connected account
  const { data: balance, isLoading: isBalanceLoading, error: balanceError } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  })

  // Debug balance loading
  useEffect(() => {
    if (address) {
      console.log('Balance data:', balance)
      console.log('Balance loading:', isBalanceLoading)
      console.log('Balance error:', balanceError)
      console.log('Chain ID:', chainId)
    }
  }, [address, balance, isBalanceLoading, balanceError, chainId])

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      setConnectionError(connectError.message)
    } else {
      setConnectionError(null)
    }
  }, [connectError])

  // Connect to MetaMask
  const connectMetaMask = useCallback(() => {
    const metaMaskConnector = connectors.find(
      (connector) => connector.name === 'MetaMask'
    )
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    } else {
      setConnectionError('MetaMask connector not found')
    }
  }, [connect, connectors])

  // Connect to WalletConnect
  const connectWalletConnect = useCallback(() => {
    const walletConnectConnector = connectors.find(
      (connector) => connector.name === 'WalletConnect'
    )
    if (walletConnectConnector) {
      connect({ connector: walletConnectConnector })
    } else {
      setConnectionError('WalletConnect connector not found')
    }
  }, [connect, connectors])

  // Connect to Injected wallet
  const connectInjected = useCallback(() => {
    const injectedConnector = connectors.find(
      (connector) => connector.name === 'Injected'
    )
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    } else {
      setConnectionError('Injected connector not found')
    }
  }, [connect, connectors])

  // Switch to a specific network
  const switchToNetwork = useCallback((targetChainId: number) => {
    if (switchChain) {
      switchChain({ chainId: targetChainId as 1 | 31337 | 50312 | 11155111 })
    }
  }, [switchChain])

  // Get chain information
  const getChainInfo = useCallback(() => {
    switch (chainId) {
      case hardhat.id:
        return { name: 'Hardhat Local', shortName: 'Hardhat', color: '#f59e0b' }
      case somniaTestnet.id:
        return { name: 'Somnia Testnet', shortName: 'Somnia', color: '#8b5cf6' }
      case sepolia.id:
        return { name: 'Sepolia', shortName: 'Sepolia', color: '#3b82f6' }
      case mainnet.id:
        return { name: 'Ethereum', shortName: 'ETH', color: '#10b981' }
      default:
        return { name: 'Unknown', shortName: 'Unknown', color: '#6b7280' }
    }
  }, [chainId])

  // Format address for display
  const formatAddress = useCallback((addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }, [])

  // Format balance for display
  const formattedBalance = balance ? formatEther(balance.value) : '0'

  return {
    // Connection state
    address,
    isConnected,
    isConnecting: isConnecting || isConnectPending,
    isDisconnected,
    
    // Balance
    balance: formattedBalance,
    isBalanceLoading,
    
    // Network
    chainId,
    chainInfo: getChainInfo(),
    
    // Actions
    connectMetaMask,
    connectWalletConnect,
    connectInjected,
    disconnect,
    switchToNetwork,
    
    // Utilities
    formatAddress,
    
    // Errors
    error: connectionError,
    
    // Available connectors
    connectors,
  }
}
