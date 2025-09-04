import { useAccount, useBalance, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { hardhat, sepolia, mainnet } from 'wagmi/chains'

export function useWalletConnection() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount()
  const { connect, connectors, error: connectError, isPending: isConnectPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Get balance for the connected account
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

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
      switchChain({ chainId: targetChainId as 1 | 31337 | 11155111 })
    }
  }, [switchChain])

  // Get chain information
  const getChainInfo = useCallback(() => {
    switch (chainId) {
      case hardhat.id:
        return { name: 'Hardhat', shortName: 'Hardhat', color: '#f59e0b' }
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
