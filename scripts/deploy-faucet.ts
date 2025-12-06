import hre from "hardhat";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  const pk = process.env.SEPOLIA_PRIVATE_KEY as string;
  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in .env");
  }

  // CLRToken and CLRFaucet addresses
  const clrTokenAddress = "0xf1664c17887767c8f58695846babb349ca61d2e9";
  console.log("Deploying CLRFaucet...\n");
  console.log(`📌 CLR Token Address: ${clrTokenAddress}\n`);

  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const deployer = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Read CLRFaucet artifact with fully qualified name
  const faucetArtifact = await hre.artifacts.readArtifact("contracts/CLRFaucet.sol:CLRFaucet");

  // Deploy CLRFaucet
  console.log("🚀 Deploying CLRFaucet contract...");
  const faucetHash = await deployer.deployContract({
    abi: faucetArtifact.abi,
    bytecode: faucetArtifact.bytecode,
    args: [clrTokenAddress],
  });

  const faucetReceipt = await publicClient.waitForTransactionReceipt({ hash: faucetHash });
  const faucetAddress = faucetReceipt.contractAddress!;

  console.log(`✅ CLRFaucet deployed to: ${faucetAddress}`);
  console.log(`🔗 Sepolia Etherscan: https://sepolia.etherscan.io/address/${faucetAddress}`);

  // Save deployment addresses
  const deploymentFile = path.join(__dirname, "../.deployments.json");
  let deploymentData: any = {};

  if (fs.existsSync(deploymentFile)) {
    deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  }

  deploymentData.clrFaucet = faucetAddress;
  deploymentData.deploymentTime = new Date().toISOString();
  deploymentData.network = "sepolia";
  deploymentData.deployedBy = account.address;

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log("\n✅ Deployment addresses saved to .deployments.json");
  console.log("\n📋 Deployment Summary:");
  console.log(`Contract: CLRFaucet`);
  console.log(`Address: ${faucetAddress}`);
  console.log(`CLR Token: ${clrTokenAddress}`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Network: ${hre.network.name}`);

  console.log("\n📌 Next Steps:");
  console.log("1. Transfer CLR tokens to the faucet to fund it");
  console.log("   Example: 10,000 CLR tokens = 10000 * 10^18");
  console.log("2. Share the faucet address with testers");
  console.log("3. Testers can call claim() to get 100 CLR tokens each");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
