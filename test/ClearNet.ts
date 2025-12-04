import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("ClearNet Simple Tests", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();
  
  const owner = wallets[0];
  const node1 = wallets[1];
  const client1 = wallets[2];
  const relay1 = wallets[3];

  // Deploy contracts
  const clrToken = await viem.deployContract("CLRToken");
  const clearNet = await viem.deployContract("ClearNet", [clrToken.address]);

  // Setup: mint tokens
  await clrToken.write.mint([node1.account.address, parseEther("100000")]);
  await clrToken.write.mint([client1.account.address, parseEther("100000")]);

  // Approve ClearNet to spend tokens
  await clrToken.write.approve([clearNet.address, parseEther("10000")], { 
    account: node1.account 
  });
  await clrToken.write.approve([clearNet.address, parseEther("10000")], { 
    account: client1.account 
  });

  // Add relay
  await clearNet.write.addRelayOperator([relay1.account.address]);

  it("Should deploy correctly", async () => {
    const tokenAddress = await clearNet.read.clrToken();
    assert.equal(getAddress(tokenAddress), getAddress(clrToken.address));
  });

  it("Should register a node", async () => {
    const tx = await clearNet.write.registerNode(
      ["192.168.1.1", 8080n, parseEther("0.1")],
      { account: node1.account }
    );
    
    const node = await clearNet.read.nodes([node1.account.address]);
    assert.equal(node[0], true); // isActive
    assert.equal(node[2], 8080n); // port
  });

  it("Should open a payment channel", async () => {
    const channelAmount = parseEther("100");
    
    await clearNet.write.openPaymentChannel(
      [node1.account.address, channelAmount],
      { account: client1.account }
    );

    const channel = await clearNet.read.paymentChannels([
      client1.account.address,
      node1.account.address
    ]);
    
    assert.equal(channel[0], channelAmount); // balance
    assert.equal(channel[1], true); // isOpen
  });

  it("Should return active nodes", async () => {
    const activeNodes = await clearNet.read.getActiveNodes();
    assert.ok(activeNodes.length > 0);
    
    const nodeAddresses = activeNodes.map((addr: string) => getAddress(addr));
    assert.ok(nodeAddresses.includes(getAddress(node1.account.address)));
  });

  it("Should check if address is relay operator", async () => {
    const isRelay = await clearNet.read.isRelayOperator([relay1.account.address]);
    assert.equal(isRelay, true);
  });
});
