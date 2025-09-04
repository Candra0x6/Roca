'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider as WagmiProviderBase } from 'wagmi'
import { getConfig } from '@/wagmi'
import { Toaster } from 'sonner'
import { useState } from 'react'

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }))

  return (
    <WagmiProviderBase config={getConfig()}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster 
          position="top-right"
          theme="dark"
          richColors
          closeButton
        />
      </QueryClientProvider>
    </WagmiProviderBase>
  )
}
