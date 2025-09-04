import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/contracts/generated.ts',
  contracts: [],
  plugins: [
    foundry({
      artifacts: 'src/contracts/',
      include: [
        'PoolFactory.json',
        'Pool.json',
        'Badge.json',
        'LotteryManager.json',
        'YieldManager.json',
        'RewardNFT.json'
      ]
    })
  ]
})
