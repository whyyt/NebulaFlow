import { ethers } from "hardhat";

async function main() {
  console.log("部署 ChallengeFactory 合约...");

  // 获取 ChallengeFactory 工厂
  const ChallengeFactory = await ethers.getContractFactory("ChallengeFactory");

  // 部署合约
  const factory = await ChallengeFactory.deploy();

  // 等待部署完成
  await factory.waitForDeployment();

  // 获取合约地址（Hardhat ^2.17 新写法）
  const address = await factory.getAddress();

  console.log("ChallengeFactory 已部署到:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});