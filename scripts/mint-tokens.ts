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
  const chain = defineChain({ 
    id: 11155111, 
    name: "sepolia", 
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, 
    rpcUrls: { default: { http: [rpcUrl] } } 
  });
  
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  
  const clrArtifact = await hre.artifacts.readArtifact("CLRToken");
  const clrAddress = "0xf1664c17887767c8f58695846babb349ca61d2e9" as `0x${string}`;
  
  // Mint 1,000,000 tokens to deployer
  const recipient = account.address;
  const amount = 1000000n * 10n**18n;
  
  console.log("Minting", amount / 10n**18n, "CLR tokens to", recipient);
  
  const hash = await walletClient.writeContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "mint",
    args: [recipient, amount],
  });
  
  console.log("Transaction hash:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ Successfully minted", amount / 10n**18n, "CLR tokens!");
  
  // Check new balance
  const balance = await publicClient.readContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "balanceOf",
    args: [recipient],
  }) as bigint;
  
  console.log("New balance:", balance / 10n**18n, "CLR");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
