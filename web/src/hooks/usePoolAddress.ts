import { useReadContract, useChainId } from 'wagmi'
import { Address } from 'viem'
import { POOL_FACTORY_ABI, getContractAddress } from '@/contracts/config'

export function usePoolAddress(poolId: string): {
  poolAddress: Address | null
  isLoading: boolean
  error: Error | null
} {
  const chainId = useChainId()
  const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')
  
  const { 
    data: poolAddress, 
    isLoading, 
    error 
  } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getPool',
    args: [BigInt(poolId)],
    query: {
      enabled: !!poolFactoryAddress && !!poolId && !isNaN(Number(poolId)),
    },
  })

  return {
    poolAddress: poolAddress as Address | null,
    isLoading,
    error,
  }
}
