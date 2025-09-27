import { Address } from 'viem'
import PoolFactoryArtifact from './PoolFactory.json'
import PoolArtifact from './Pool.json'
import BadgeArtifact from './Badge.json'
import LotteryManagerArtifact from './LotteryManager.json'
import YieldManagerArtifact from './YieldManager.json'
import RewardNFTArtifact from './RewardNFT.json'

// Contract addresses - these will be updated after deployment
export const CONTRACT_ADDRESSES = {
  // Hardhat localhost addresses (updated after deployment)
  31337: {
    poolFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    badge: '0x' as Address, // RewardNFT serving as badge
    lotteryManager: '0x' as Address,
    yieldManager: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address, // MockYieldManager
    rewardNFT: '0x' as Address,
  },
  // Sepolia testnet addresses (to be filled after deployment)
  11155111: {
    poolFactory: '0x' as Address,
    badge: '0x' as Address,
    lotteryManager: '0x' as Address,
    yieldManager: '0x' as Address,
    rewardNFT: '0x' as Address,
  },
  // Mainnet addresses (to be filled after deployment)
  1: {
    poolFactory: '0x' as Address,
    badge: '0x' as Address,
    lotteryManager: '0x' as Address,
    yieldManager: '0x' as Address,
    rewardNFT: '0x' as Address,
  },
  // Somnia testnet addresses (to be filled after deployment)
  50312: {
    poolFactory: '0x92E41BCf5415Ea1e47f25691620a3F5B964abEFF' as Address,
    badge: '0x' as Address, // RewardNFT serving as badge
    lotteryManager: '0x' as Address,
    yieldManager: '0xC535a29eee933244e71Faf4ca82D9bF746EBa2Ee' as Address, // YieldManager
    rewardNFT: '0x' as Address,
    },

  // ZetaChain Athens 3 testnet addresses (to be filled after deployment)
  7001: {
    poolFactory: '0x3FF7573961a252b652d32B3910D3B2b90D8A3Bd8' as Address,
    badge: '0x' as Address, // RewardNFT serving as badge
    lotteryManager: '0x' as Address,
    yieldManager: '0x356Be1db672aFEC735B4b757f9781D40b1dE4f06' as Address, // YieldManager
    rewardNFT: '0x' as Address,
  },
} as const

// Contract ABIs
export const POOL_FACTORY_ABI = PoolFactoryArtifact.abi
export const POOL_ABI = PoolArtifact.abi
export const BADGE_ABI = BadgeArtifact.abi
export const LOTTERY_MANAGER_ABI = LotteryManagerArtifact.abi
export const YIELD_MANAGER_ABI = YieldManagerArtifact.abi
export const REWARD_NFT_ABI = RewardNFTArtifact.abi

// Helper function to get contract address for current chain
export function getContractAddress(
  chainId: number, 
  contract: 'poolFactory' | 'badge' | 'lotteryManager' | 'yieldManager' | 'rewardNFT'
): Address {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  if (!addresses) {
    console.warn(`Unsupported chain ID: ${chainId}, using Somnia testnet addresses`)
    return CONTRACT_ADDRESSES[50312][contract]
  }
  return addresses[contract]
}
