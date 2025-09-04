import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentRecord {
  timestamp: string;
  network: string;
  chainId: string;
  deployer: string;
  contracts: {
    [contractName: string]: {
      address: string;
      transactionHash: string;
      blockNumber: number;
    };
  };
}

/**
 * Save deployment information to a JSON file for future reference
 */
export async function saveDeployment(
  contracts: { [name: string]: string },
  deployer: string,
  filename?: string
) {
  const network = await ethers.provider.getNetwork();
  const timestamp = new Date().toISOString();
  
  const deployment: DeploymentRecord = {
    timestamp,
    network: network.name,
    chainId: network.chainId.toString(),
    deployer,
    contracts: {}
  };

  // Get transaction details for each contract
  for (const [name, address] of Object.entries(contracts)) {
    try {
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        console.warn(`⚠️  Warning: No code found at ${address} for ${name}`);
      }
      
      deployment.contracts[name] = {
        address,
        transactionHash: "", // Would need to store this during deployment
        blockNumber: await ethers.provider.getBlockNumber()
      };
    } catch (error) {
      console.error(`Error getting details for ${name}:`, error);
    }
  }

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = filename || `deployment-${network.chainId}-${Date.now()}.json`;
  const filePath = path.join(deploymentsDir, deploymentFile);
  
  fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  console.log(`📄 Deployment saved to: ${filePath}`);
  
  return deployment;
}

/**
 * Load a previous deployment record
 */
export function loadDeployment(filename: string): DeploymentRecord | null {
  try {
    const filePath = path.join(__dirname, "..", "deployments", filename);
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error loading deployment:", error);
    return null;
  }
}

/**
 * List all deployment files
 */
export function listDeployments(): string[] {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    return [];
  }
  
  return fs.readdirSync(deploymentsDir)
    .filter(file => file.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a)); // Most recent first
}

/**
 * Verify all contracts in a deployment are still deployed
 */
export async function verifyDeployment(deployment: DeploymentRecord): Promise<boolean> {
  console.log(`🔍 Verifying deployment from ${deployment.timestamp}...`);
  
  let allVerified = true;
  
  for (const [name, info] of Object.entries(deployment.contracts)) {
    try {
      const code = await ethers.provider.getCode(info.address);
      if (code === "0x") {
        console.error(`❌ ${name} at ${info.address} has no code`);
        allVerified = false;
      } else {
        console.log(`✅ ${name} verified at ${info.address}`);
      }
    } catch (error) {
      console.error(`❌ Error verifying ${name}:`, error);
      allVerified = false;
    }
  }
  
  return allVerified;
}

/**
 * Generate environment variables for frontend
 */
export function generateEnvVars(deployment: DeploymentRecord): string {
  let envContent = `# Generated on ${deployment.timestamp}\n`;
  envContent += `# Network: ${deployment.network} (Chain ID: ${deployment.chainId})\n`;
  envContent += `# Deployer: ${deployment.deployer}\n\n`;

  for (const [name, info] of Object.entries(deployment.contracts)) {
    const envVarName = `NEXT_PUBLIC_HARDHAT_${name.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '')}`;
    envContent += `${envVarName}=${info.address}\n`;
  }

  return envContent;
}

/**
 * Main utility function for CLI usage
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case "list":
      console.log("📋 Available deployments:");
      const deployments = listDeployments();
      if (deployments.length === 0) {
        console.log("No deployments found.");
      } else {
        deployments.forEach((file, index) => {
          console.log(`${index + 1}. ${file}`);
        });
      }
      break;
      
    case "verify":
      const filename = process.argv[3];
      if (!filename) {
        console.error("Usage: npx ts-node scripts/deployment-utils.ts verify <filename>");
        process.exit(1);
      }
      
      const deployment = loadDeployment(filename);
      if (!deployment) {
        console.error("Deployment file not found.");
        process.exit(1);
      }
      
      const verified = await verifyDeployment(deployment);
      if (verified) {
        console.log("✅ All contracts verified successfully!");
      } else {
        console.log("❌ Some contracts failed verification.");
        process.exit(1);
      }
      break;
      
    case "env":
      const envFilename = process.argv[3];
      if (!envFilename) {
        console.error("Usage: npx ts-node scripts/deployment-utils.ts env <filename>");
        process.exit(1);
      }
      
      const envDeployment = loadDeployment(envFilename);
      if (!envDeployment) {
        console.error("Deployment file not found.");
        process.exit(1);
      }
      
      const envVars = generateEnvVars(envDeployment);
      console.log("🔧 Environment variables:");
      console.log(envVars);
      
      // Optionally save to .env.local
      const outputFile = process.argv[4];
      if (outputFile) {
        fs.writeFileSync(outputFile, envVars);
        console.log(`💾 Saved to ${outputFile}`);
      }
      break;
      
    default:
      console.log("Deployment Utilities");
      console.log("Usage:");
      console.log("  npx ts-node scripts/deployment-utils.ts list");
      console.log("  npx ts-node scripts/deployment-utils.ts verify <filename>");
      console.log("  npx ts-node scripts/deployment-utils.ts env <filename> [output-file]");
      break;
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}
