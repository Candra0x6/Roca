import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

interface ContractAddresses {
  mockYieldManager?: string;
  yieldManager?: string;
  rewardNFT?: string;
  badge?: string;
  lotteryManager?: string;
  poolFactory?: string;
}

async function updateWebConfig(addresses: ContractAddresses, chainId: number = 31337) {
  try {
    const configPath = join(__dirname, "../../web/src/contracts/config.ts");
    const configContent = readFileSync(configPath, "utf8");
    
    // Create the addresses object for the specified chain
    const chainAddresses = {
      poolFactory: addresses.poolFactory || '0x',
      badge: addresses.badge || addresses.rewardNFT || '0x',
      lotteryManager: addresses.lotteryManager || '0x',
      yieldManager: addresses.yieldManager || addresses.mockYieldManager || '0x',
      rewardNFT: addresses.rewardNFT || '0x',
    };
    
    // Build the replacement string
    const addressBlock = `${chainId}: {
    poolFactory: '${chainAddresses.poolFactory}' as Address,
    badge: '${chainAddresses.badge}' as Address, // RewardNFT serving as badge
    lotteryManager: '${chainAddresses.lotteryManager}' as Address,
    yieldManager: '${chainAddresses.yieldManager}' as Address, // ${chainId === 31337 ? 'MockYieldManager' : 'YieldManager'}
    rewardNFT: '${chainAddresses.rewardNFT}' as Address,
  },`;
    
    // Update the specified network addresses
    const regex = new RegExp(`${chainId}: \\{[\\s\\S]*?\\},`);
    const updatedConfig = configContent.replace(regex, addressBlock);
    
    writeFileSync(configPath, updatedConfig);
    console.log(`✅ Web config updated successfully for chain ${chainId}!`);
    console.log("Updated addresses:");
    Object.entries(chainAddresses).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
  } catch (error) {
    console.error("❌ Could not update web config:", error);
    console.log("Please manually update the addresses in web/src/contracts/config.ts");
    process.exit(1);
  }
}

// Allow script to be called directly with addresses as arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: npx ts-node scripts/update-web-config.ts <options>");
    console.log("Options:");
    console.log("  --chain <chainId>              Chain ID (default: 31337)");
    console.log("  --pool-factory <address>       PoolFactory address");
    console.log("  --reward-nft <address>         RewardNFT address");
    console.log("  --lottery-manager <address>    LotteryManager address");
    console.log("  --yield-manager <address>      YieldManager address");
    console.log("");
    console.log("Example:");
    console.log("  npx ts-node scripts/update-web-config.ts \\");
    console.log("    --pool-factory 0x123... \\");
    console.log("    --reward-nft 0x456... \\");
    console.log("    --lottery-manager 0x789... \\");
    console.log("    --yield-manager 0xabc...");
    process.exit(1);
  }
  
  let chainId = 31337;
  const addresses: ContractAddresses = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const option = args[i];
    const value = args[i + 1];
    
    switch (option) {
      case '--chain':
        chainId = parseInt(value);
        break;
      case '--pool-factory':
        addresses.poolFactory = value;
        break;
      case '--reward-nft':
        addresses.rewardNFT = value;
        break;
      case '--lottery-manager':
        addresses.lotteryManager = value;
        break;
      case '--yield-manager':
        addresses.yieldManager = value;
        break;
      case '--mock-yield-manager':
        addresses.mockYieldManager = value;
        break;
      default:
        console.warn(`Unknown option: ${option}`);
    }
  }
  
  updateWebConfig(addresses, chainId).catch(console.error);
}

export { updateWebConfig };
