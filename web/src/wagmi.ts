import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, walletConnect, metaMask } from 'wagmi/connectors'

export function getConfig() {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '52752c5aca18cc94810cbad1984bc8a6'
  
  return createConfig({
    chains: [hardhat, sepolia, mainnet],
    connectors: [
      metaMask(),
      injected({ target: 'metaMask' }),
      walletConnect({ 
        projectId,
       
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [hardhat.id]: http('http://127.0.0.1:8545'),
      [sepolia.id]: http(),
      [mainnet.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
