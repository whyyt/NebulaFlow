# 合约部署信息

## 最新部署地址（2025-01-XX - 最新）

### 合约地址
- **ActivityRegistry**: `0x9E545E3C0baAB3E08CdfD552C960A1050f373042`
- **ActivityFactory**: `0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9`
- **NFTActivityFactory**: `0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8`

### 部署账户
- 部署账户: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 账户余额: 10001.971221007679001452 ETH

### 新增功能
- **Social Web3 一次签名创建和报名**: 在 `NFTActivityFactory` 合约中添加了 `createNFTActivityAndJoin` 函数，允许 Social Web3 活动通过一次钱包弹窗完成活动创建和报名参加。
- **NFTActivity 新增函数**: 添加了 `joinActivityForCreator` 函数，允许工厂合约代表创建者加入活动。

### 前端配置
所有前端文件中的合约地址已更新：
- `client/app/create/page.tsx`
- `client/app/activities/page.tsx`
- `client/app/activities/[id]/page.tsx`
- `client/app/profile/page.tsx`
- `client/app/dashboard/page.tsx`
- `client/app/create-nft/page.tsx`
- `client/app/nft-activities/[id]/page.tsx`

### 部署命令
```bash
npx hardhat run scripts/deploy-activity-system.ts --network localhost
```

### 测试
运行以下命令验证部署：
```bash
npx hardhat run scripts/debug_read_activities.ts --network localhost
```
