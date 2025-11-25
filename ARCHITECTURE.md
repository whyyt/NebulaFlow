# NebulaFlow Web3活动平台架构文档

## 📋 系统概述

NebulaFlow是一个Web3活动平台，支持两种激励机制（押金奖池和NFT奖励）和三种活动类别（Professional Web3、Social Web3、Lifestyle）。

## 🏗️ 智能合约架构

### 1. ActivityRegistry.sol
**功能**: 活动注册表，管理所有活动的元数据和分类

**核心功能**:
- 注册活动（类别、激励类型、合约地址）
- 管理用户活动列表（公开/私密）
- 验证类别和激励类型的组合规则
- 更新活动可见性（仅Social Web3）

**关键规则**:
- Professional Web3 → 必须使用NFT，必须公开
- Social Web3 → 可使用押金或NFT，可选公开
- Lifestyle → 可使用押金或NFT，必须私密

### 2. NFTReward.sol
**功能**: NFT奖励合约，用于活动参与证明

**支持的NFT类型**:
- POAP: 参与证明（一次性活动）
- Badge: 成就徽章（完成证明）
- Dynamic: 动态NFT（可更新元数据）
- Completion: 完成证明（用于Lifestyle活动）

**核心功能**:
- 铸造NFT（单个/批量）
- 更新动态NFT元数据
- 查询用户NFT列表
- 查询活动关联的NFT

### 3. ActivityFactory.sol
**功能**: 统一的活动创建工厂

**核心功能**:
- `createDepositChallenge`: 创建押金挑战活动
- `createNFTReward`: 创建NFT奖励活动
- 自动注册到ActivityRegistry

### 4. Challenge.sol (已存在)
**功能**: 押金挑战合约，处理押金托管、签到、淘汰与结算

**保持不变**: 现有逻辑继续使用，通过ActivityFactory创建时会自动注册到ActivityRegistry

## 🎨 前端架构

### 目录结构
```
client/
├── app/
│   ├── create/          # 创建活动页面
│   ├── dashboard/       # 个人仪表板（公开/私密档案）
│   └── page.tsx         # 主页（现有）
├── components/
│   └── activities/
│       ├── CreateActivityForm.tsx    # 创建活动表单
│       ├── ActivityDashboard.tsx     # 活动仪表板
│       └── NFTVerification.tsx       # NFT验证组件
└── lib/
    ├── types.ts                      # TypeScript类型定义
    └── activityRegistry.ts           # 活动注册表工具函数
```

### 核心组件

#### 1. CreateActivityForm
- 活动类别选择（Professional/Social/Lifestyle）
- 激励类型选择（押金/NFT）
- 动态表单字段（根据选择的类型显示不同字段）
- 自动验证类别和激励类型的组合

#### 2. ActivityDashboard
- 公开/私密档案切换
- 活动列表展示
- 活动详情卡片（类别、激励类型、描述等）

#### 3. NFTVerification
- NFT Token ID输入
- NFT元数据查询和展示
- 验证状态显示

## 📊 数据流

### 创建活动流程
1. 用户选择活动类别和激励类型
2. 前端验证组合规则
3. 调用ActivityFactory创建合约
4. ActivityFactory自动注册到ActivityRegistry
5. 返回活动ID和合约地址

### 用户参与流程

#### 押金挑战
1. 用户查看活动详情
2. 调用Challenge合约的`joinChallenge`（支付押金）
3. 前端调用ActivityRegistry的`addUserActivity`
4. 根据活动类别自动添加到公开/私密档案

#### NFT奖励
1. 用户参与活动（线下或链上验证）
2. 组织者调用NFTReward合约的`mint`
3. 前端调用ActivityRegistry的`addUserActivity`
4. 根据活动类别自动添加到公开/私密档案

### 档案管理
- **公开档案**: 仅显示Professional Web3和用户选择的Social Web3活动
- **私密档案**: 显示所有Lifestyle活动以及未选择公开的Social Web3活动

## 🔐 类别验证规则

### Professional Web3
- ✅ 必须使用NFT奖励
- ✅ 必须公开
- ❌ 不能使用押金奖池
- ❌ 不能设为私密

### Social Web3
- ✅ 可使用押金奖池或NFT奖励
- ✅ 可选公开/私密
- ✅ 用户可以切换可见性

### Lifestyle
- ✅ 可使用押金奖池或NFT奖励
- ❌ 不能公开
- ✅ 只能进入私密档案

## 📝 NFT元数据结构

```json
{
  "nftType": 0,  // POAP/Badge/Dynamic/Completion
  "activityId": 123,
  "title": "Web3 Meetup 2024",
  "description": "参与证明",
  "mintedAt": 1704067200,
  "isVerified": true,
  "image": "https://...",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Professional Web3"
    }
  ]
}
```

## 🚀 部署步骤

### 1. 部署智能合约
```bash
# 1. 部署ActivityRegistry
npx hardhat run scripts/deploy-registry.ts

# 2. 部署ActivityFactory（需要ActivityRegistry地址）
npx hardhat run scripts/deploy-factory.ts

# 3. 更新前端配置中的合约地址
```

### 2. 更新前端配置
在以下文件中更新合约地址：
- `client/lib/activityRegistry.ts`
- `client/app/create/page.tsx`
- `client/app/dashboard/page.tsx`

### 3. 生成TypeScript类型
```bash
npx hardhat compile
npx typechain --target ethers-v6 --out-dir typechain-types './artifacts/contracts/**/*.json'
```

## 🔄 集成现有系统

### 与现有Challenge合约集成
- 现有Challenge合约保持不变
- 通过ActivityFactory创建时会自动注册
- 可以手动将现有Challenge注册到ActivityRegistry

### 向后兼容
- 现有的ChallengeFactory继续可用
- 新系统通过ActivityFactory创建
- 两种方式可以并存

## 📚 API路由（可选）

如果需要服务端支持，可以创建以下API路由：

```
/api/activities
  GET  - 获取活动列表
  POST - 创建活动（如果需要服务端验证）

/api/activities/[id]
  GET  - 获取活动详情

/api/users/[address]/activities
  GET  - 获取用户活动列表

/api/nft/[tokenId]
  GET  - 获取NFT元数据
```

## 🎯 下一步开发建议

1. **完善NFT元数据服务**: 实现IPFS或中心化存储
2. **添加活动搜索**: 按类别、激励类型筛选
3. **实现活动统计**: 参与人数、完成率等
4. **添加社交功能**: 活动分享、评论等
5. **实现动态NFT**: 根据活动进度更新NFT元数据
6. **添加多链支持**: 支持多个区块链网络

## ⚠️ 注意事项

1. **合约地址**: 部署后需要更新所有前端配置中的合约地址
2. **Gas优化**: 批量操作时考虑Gas成本
3. **安全性**: NFT铸造权限需要严格控制
4. **元数据**: NFT元数据需要可靠的存储方案
5. **用户体验**: 考虑添加交易状态提示和错误处理

