import hre from "hardhat";
import { createPublicClient, http, defineChain } from "viem";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }

  const sepolia = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");

  const clearNetAddress = "0x0305e95225f65db13e98c775dbb95b98178ae73b" as `0x${string}`;
  const yourAddress = "0xc4C55e92489a4628d6caE6074D489ED033898146" as `0x${string}`;

  console.log("=== Checking Registered Node ===");
  console.log("ClearNet contract:", clearNetAddress);
  console.log("Your address:", yourAddress);

  // Get all active nodes
  const activeNodes = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "getActiveNodes",
  } as any) as string[];

  console.log("\n=== All Active Nodes ===");
  console.log("Total active nodes:", activeNodes.length);
  
  if (activeNodes.length > 0) {
    console.log("\nActive node addresses:");
    activeNodes.forEach((node, index) => {
      const isYou = node.toLowerCase() === yourAddress.toLowerCase();
      console.log(`  ${index + 1}. ${node}${isYou ? " ← YOU" : ""}`);
    });
  }

  // Check if your address is registered
  const isRegistered = activeNodes.some(node => node.toLowerCase() === yourAddress.toLowerCase());
  
  if (isRegistered) {
    console.log("\n✅ Your node is registered!");
    
    // Get detailed node info
    const nodeInfo = await publicClient.readContract({
      address: clearNetAddress,
      abi: clearNetArtifact.abi,
      functionName: "getNodeInfo",
      args: [yourAddress],
    } as any) as any;

    console.log("\n=== Your Node Details ===");
    console.log("IP Address:", nodeInfo[0]);
    console.log("Port:", nodeInfo[1]);
    console.log("Price Per Minute:", (Number(nodeInfo[2]) / 1e18).toFixed(4), "CLR");
    console.log("Reputation Score:", (Number(nodeInfo[3]) / 1000).toFixed(3));
    console.log("Total Minutes Served:", nodeInfo[4].toString());
    console.log("Total Earnings:", (Number(nodeInfo[5]) / 1e18).toFixed(4), "CLR");
  } else {
    console.log("\n❌ Your node is NOT registered");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
