import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { Address } from 'viem'
import { BADGE_ABI, getContractAddress } from '@/contracts/config'
import { BadgeMetadata, BadgeType, UseBadgeReturn } from '@/contracts/types'

export function useBadge(): UseBadgeReturn {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const badgeAddress = getContractAddress(chainId, 'badge')

  // Read user badges
  const { data: userBadges = [], refetch: refetchBadges } = useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'getUserBadges',
    args: account ? [account] : undefined,
    query: {
      enabled: !!badgeAddress && !!account,
    },
  })

  // Get badge details function
  const getBadge = useCallback(async (tokenId: bigint): Promise<BadgeMetadata | null> => {
    if (!badgeAddress) return null

    try {
      setIsLoading(true)
      setError(null)

      const badge = await useReadContract({
        address: badgeAddress,
        abi: BADGE_ABI,
        functionName: 'getBadge',
        args: [tokenId],
      })

      const badgeData = badge.data as any
      if (!badgeData) return null

      return {
        tokenId,
        badgeType: badgeData.badgeType as BadgeType,
        poolAddress: badgeData.poolAddress,
        recipient: badgeData.recipient,
        timestamp: badgeData.timestamp,
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get badge')
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [badgeAddress])

  // Transform raw badge data to typed format
  const badges: BadgeMetadata[] = (userBadges as any[]).map((badge: any) => ({
    tokenId: badge.tokenId,
    badgeType: badge.badgeType as BadgeType,
    poolAddress: badge.poolAddress,
    recipient: badge.recipient,
    timestamp: badge.timestamp,
  }))

  return {
    badges,
    getBadge,
    isLoading,
    error,
  }
}

// Hook to get badge metadata URI
export function useBadgeMetadata(tokenId: bigint) {
  const chainId = useChainId()
  const badgeAddress = getContractAddress(chainId, 'badge')

  const { data: metadataURI, isLoading, error } = useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
    query: {
      enabled: !!badgeAddress && tokenId !== undefined,
    },
  })

  return {
    metadataURI: metadataURI as string | undefined,
    isLoading,
    error,
  }
}

// Hook to check if user has specific badge type
export function useHasBadge(badgeType: BadgeType, poolAddress?: Address) {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const badgeContract = getContractAddress(chainId, 'badge')

  const { data: hasBadge, isLoading, error } = useReadContract({
    address: badgeContract,
    abi: BADGE_ABI,
    functionName: 'hasBadge',
    args: account && poolAddress ? [account, badgeType, poolAddress] : undefined,
    query: {
      enabled: !!badgeContract && !!account && (poolAddress !== undefined || badgeType !== undefined),
    },
  })

  return {
    hasBadge: hasBadge as boolean | undefined,
    isLoading,
    error,
  }
}
