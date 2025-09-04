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
    badge: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address, // RewardNFT serving as badge
    lotteryManager: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address,
    yieldManager: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address, // MockYieldManager
    rewardNFT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
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
    console.warn(`Unsupported chain ID: ${chainId}, using default hardhat addresses`)
    return CONTRACT_ADDRESSES[31337][contract]
  }
  return addresses[contract]
}
