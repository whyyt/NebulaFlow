# NebulaFlow 快速开始指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/yeyutong/project/NebulaFlow

# 安装合约依赖（如果还没有）
npm install

# 安装前端依赖（如果还没有）
cd client
npm install
cd ..
```

### 2. 编译智能合约

```bash
npx hardhat compile
```

### 3. 启动本地网络（可选）

```bash
npx hardhat node
```

### 4. 部署合约

```bash
# 在另一个终端中
npx hardhat run scripts/deploy-activity-system.ts --network localhost
```

部署后会输出合约地址，请保存这些地址。

### 5. 更新前端配置

编辑以下文件，更新合约地址：

**`client/lib/activityRegistry.ts`**:
```typescript
// 更新这些地址
export const ACTIVITY_REGISTRY_ADDRESS = "0x..."; // 从部署输出复制
export const ACTIVITY_FACTORY_ADDRESS = "0x...";   // 从部署输出复制
```

**`client/app/create/page.tsx`**:
```typescript
const ACTIVITY_FACTORY_ADDRESS = "0x..."; // 从部署输出复制
```

**`client/app/dashboard/page.tsx`**:
```typescript
const ACTIVITY_REGISTRY_ADDRESS = "0x..."; // 从部署输出复制
```

### 6. 生成TypeScript类型（可选）

```bash
npx hardhat compile
npx typechain --target ethers-v6 --out-dir typechain-types './artifacts/contracts/**/*.json'
```

### 7. 启动前端

```bash
cd client
npm run dev
```

访问 http://localhost:3000

## 📋 使用流程

### 创建活动

1. 访问 `/create` 页面
2. 选择活动类别：
   - **Professional Web3**: 用于求职，必须使用NFT，必须公开
   - **Social Web3**: 社交活动，可使用押金或NFT，可选公开
   - **Lifestyle**: 生活自律类，可使用押金或NFT，必须私密
3. 选择激励类型：
   - **押金奖池**: 仅用于长期连续挑战（Lifestyle或Social）
   - **NFT奖励**: 用于任何需要证明的活动
4. 填写活动信息
5. 提交创建

### 查看活动档案

1. 访问 `/dashboard` 页面
2. 切换"公开档案"和"私密档案"标签
3. 查看参与的所有活动

### 参与押金挑战

1. 在主页或活动详情页找到押金挑战
2. 点击"报名"按钮
3. 支付押金
4. 每日签到完成挑战
5. 完成挑战后可领取奖励

### 参与NFT活动

1. 参与活动（线下或链上）
2. 组织者铸造NFT给你
3. 在仪表板查看获得的NFT
4. 使用NFT验证组件验证NFT

## 🎯 示例场景

### 场景1: 创建Professional Web3活动（Hackathon）

1. 类别: Professional Web3
2. 激励类型: NFT奖励
3. NFT名称: "Web3 Hackathon 2024"
4. NFT符号: "W3H"
5. 自动公开到档案

### 场景2: 创建Lifestyle活动（7天阅读挑战）

1. 类别: Lifestyle
2. 激励类型: 押金奖池
3. 押金: 0.01 ETH
4. 挑战天数: 7
5. 最大参与人数: 50
6. 自动添加到私密档案

### 场景3: 创建Social Web3活动（Meetup）

1. 类别: Social Web3
2. 激励类型: NFT奖励
3. NFT名称: "Web3 Meetup"
4. 用户可选择是否公开

## ⚠️ 常见问题

### Q: 为什么Professional Web3不能使用押金？
A: 根据业务规则，Professional Web3活动主要用于求职证明，需要NFT作为凭证，押金机制不适用。

### Q: Lifestyle活动可以公开吗？
A: 不可以。Lifestyle活动是私密的自律挑战，只能进入私密档案。

### Q: 如何更新NFT元数据？
A: 对于Dynamic类型的NFT，合约所有者可以调用`updateTokenURI`更新元数据。

### Q: 现有Challenge合约如何集成？
A: 可以手动调用ActivityRegistry的`registerActivity`将现有Challenge注册到系统中。

## 📚 更多信息

- 详细架构: `ARCHITECTURE.md`
- 实现总结: `IMPLEMENTATION_SUMMARY.md`
- 智能合约: `contracts/`
- 前端组件: `client/components/activities/`

