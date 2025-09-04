import { useReadContract, useChainId } from 'wagmi'
import { Address } from 'viem'
import { POOL_FACTORY_ABI, getContractAddress } from '@/contracts/config'

export function usePoolId(poolAddress: Address) {
  const chainId = useChainId()
  const poolFactoryAddress = getContractAddress(chainId, 'poolFactory')

  const { data: poolId, isLoading, error, refetch } = useReadContract({
    address: poolFactoryAddress,
    abi: POOL_FACTORY_ABI,
    functionName: 'getPoolId',
    args: [poolAddress],
    query: {
      enabled: !!poolFactoryAddress && !!poolAddress && poolAddress !== '0x',
    },
  })

  return {
    poolId: poolId as bigint | undefined,
    isLoading,
    error,
    refetch,
  }
}
