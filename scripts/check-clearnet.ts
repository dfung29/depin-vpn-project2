import hre from "hardhat";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  const pk = process.env.SEPOLIA_PRIVATE_KEY as string;

  const sepolia = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(pk as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");
  const clearNetAddress = "0xf04cbb756045b276ea962ea98d938a0ed8101f51" as `0x${string}`;

  console.log("=== Checking ClearNet Contract State ===\n");

  // Check if paused
  const paused = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "paused",
    args: [],
  } as any);
  console.log("Contract Paused:", paused);

  // Check if caller is relay operator
  const callerAddress = "0x26f6e150da10abea82fdc55c93d2fb25386fcaa0" as `0x${string}`;
  const isRelay = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "isRelayOperator",
    args: [callerAddress],
  } as any);
  console.log("Caller is Relay Operator:", isRelay);

  // Get deployer address (owner)
  const owner = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "owner",
    args: [],
  } as any);
  console.log("Contract Owner:", owner);
  console.log("Your Address:", account.address);

  console.log("\n=== Transaction Analysis ===");
  console.log("Function Called: registerNode");
  console.log("IP Address Provided: 5r.158.82.48 ❌ INVALID - should be xxx.xxx.xxx.xxx");
  console.log("Port: 51886");
  console.log("Price Per Minute: 1 CLR");

  console.log("\n=== Why It Failed ===");
  console.log("Most likely: The IP address '5r.158.82.48' is INVALID.");
  console.log("Valid IPv4 format: xxx.xxx.xxx.xxx (e.g., 192.168.1.1)");
  console.log("Also check: Contract is not paused and you're registered.");

  console.log("\n=== To Fix ===");
  console.log("1. Use a valid IPv4 address (only numbers and dots)");
  console.log("2. Try calling registerNode again with valid IP");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
