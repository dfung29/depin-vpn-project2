import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("CLRToken Simple Tests", async function () {
  const { viem } = await network.connect();
  const wallets = await viem.getWalletClients();
  
  const owner = wallets[0];
  const user1 = wallets[1];
  const user2 = wallets[2];

  const clrToken = await viem.deployContract("CLRToken");

  it("Should have correct token details", async () => {
    const name = await clrToken.read.name();
    const symbol = await clrToken.read.symbol();
    const decimals = await clrToken.read.decimals();

    assert.equal(name, "ClearNet Token");
    assert.equal(symbol, "CLR");
    assert.equal(decimals, 18);
  });

  it("Should mint initial supply to deployer", async () => {
    const balance = await clrToken.read.balanceOf([owner.account.address]);
    const expectedSupply = parseEther("10000000"); // 10 million
    assert.equal(balance, expectedSupply);
  });

  it("Should allow owner to mint tokens", async () => {
    const mintAmount = parseEther("1000");
    await clrToken.write.mint([user1.account.address, mintAmount]);

    const balance = await clrToken.read.balanceOf([user1.account.address]);
    assert.equal(balance, mintAmount);
  });

  it("Should allow token transfers", async () => {
    const transferAmount = parseEther("100");
    await clrToken.write.transfer([user2.account.address, transferAmount], {
      account: user1.account
    });

    const balance = await clrToken.read.balanceOf([user2.account.address]);
    assert.equal(balance, transferAmount);
  });

  it("Should allow burning tokens", async () => {
    const burnAmount = parseEther("50");
    const balanceBefore = await clrToken.read.balanceOf([user2.account.address]);
    
    await clrToken.write.burn([burnAmount], { account: user2.account });
    
    const balanceAfter = await clrToken.read.balanceOf([user2.account.address]);
    assert.equal(balanceAfter, balanceBefore - burnAmount);
  });
});
