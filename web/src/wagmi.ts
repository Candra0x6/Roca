import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, walletConnect, metaMask } from 'wagmi/connectors'

// Define Somnia testnet chain
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { 
      name: 'Shannon Explorer', 
      url: 'https://shannon-explorer.somnia.network' 
    },
  },
  testnet: true,
} as const
export const zetaChainAthens3 = {
  id: 7001,
  name: 'ZetaChain Athens 3',
  nativeCurrency: { name: 'Zeta', symbol: 'aZETA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://athens3.zetascan.io' },
  },
} as const;


export function getConfig() {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '52752c5aca18cc94810cbad1984bc8a6'
  
  return createConfig({
    chains: [hardhat, somniaTestnet, zetaChainAthens3, sepolia, mainnet],
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
      [hardhat.id]: http('http://localhost:8545'),
      [somniaTestnet.id]: http('https://dream-rpc.somnia.network'),
      [zetaChainAthens3.id]: http('https://zetachain-athens-evm.blockpi.network/v1/rpc/public'),
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
