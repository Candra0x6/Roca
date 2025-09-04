it("should generate yield after time passes", async () => {
  const depositAmount = ethers.parseEther("1");

  // Deposit ke YieldManager
  await yieldManager.connect(user).deposit(1, 0, { value: depositAmount }); 

  // Loncat waktu 30 hari
  await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
  await network.provider.send("evm_mine");

  // Update yield
  await yieldManager.updateYield(1);

  // Cek yield
  const yieldGenerated = await yieldManager.getYield(1);
  console.log("Yield:", ethers.formatEther(yieldGenerated));
});
