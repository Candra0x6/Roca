import { useChainId } from 'wagmi'

export const useNativeToken = () => {
  const chainId = useChainId()

  const getNativeTokenSymbol = (): string => {
    switch (chainId) {
      case 31337: // Hardhat
        return 'ETH'
      case 11155111: // Sepolia
        return 'ETH'
      case 1: // Mainnet
        return 'ETH'
      case 7001: // ZetaChain testnet
        return 'ZETA'
      case 7000: // ZetaChain mainnet
        return 'ZETA'
      case 1946: // Somnia testnet
        return 'STT'
      case 50312: // Somnia mainnet
        return 'STT'
      default:
        return 'ETH' // fallback
    }
  }

  return {
    symbol: getNativeTokenSymbol(),
    chainId
  }
}