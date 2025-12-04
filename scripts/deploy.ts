import hre from "hardhat";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  const pk = process.env.SEPOLIA_PRIVATE_KEY as string;
  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in .env");
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = defineChain({ id: 11155111, name: "sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } });
  const deployer = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Read artifacts
  const clrArtifact = await hre.artifacts.readArtifact("CLRToken");
  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");

  // Deploy CLRToken
  const clrTokenHash = await deployer.deployContract({
    abi: clrArtifact.abi,
    bytecode: clrArtifact.bytecode,
    args: [],
  });
  const clrReceipt = await publicClient.waitForTransactionReceipt({ hash: clrTokenHash });
  const clrTokenAddress = clrReceipt.contractAddress!;
  console.log("CLRToken deployed to:", clrTokenAddress);

  // Deploy ClearNet with CLRToken address
  const clearNetHash = await deployer.deployContract({
    abi: clearNetArtifact.abi,
    bytecode: clearNetArtifact.bytecode,
    args: [clrTokenAddress],
  });
  const clearNetReceipt = await publicClient.waitForTransactionReceipt({ hash: clearNetHash });
  const clearNetAddress = clearNetReceipt.contractAddress!;
  console.log("ClearNet deployed to:", clearNetAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
