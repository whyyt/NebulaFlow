# NebulaFlow Web3 押金挑战活动平台架构文档

## 📋 系统概述

NebulaFlow 是一个基于区块链的押金挑战活动平台，支持创建和管理押金奖池活动。

## 🏗️ 智能合约架构

### 1. ActivityRegistry.sol
**功能**: 活动注册表，管理所有活动的元数据

**核心功能**:
- 注册活动（合约地址、标题、描述、是否公开）
- 管理用户活动列表
- 查询活动元数据
- 活动总数统计

**关键数据结构**:
```solidity
struct ActivityMetadata {
    address activityContract;  // Challenge 合约地址
    address creator;
    string title;
    string description;
    uint256 createdAt;
    bool isPublic;  // 是否公开显示
}
```

### 2. ActivityFactory.sol
**功能**: 押金挑战活动创建工厂

**核心功能**:
- `createDepositChallenge`: 创建押金挑战活动
- 自动注册到 ActivityRegistry
- 维护所有创建的挑战地址列表
- 提供挑战查询功能

**关键函数**:
- `createDepositChallenge`: 创建并注册押金挑战
- `getAllChallenges`: 获取所有挑战地址
- `challengeCount`: 获取挑战总数

### 3. Challenge.sol
**功能**: 押金挑战合约，处理押金托管、签到、淘汰与结算

**核心功能**:
- 参与者报名和押金托管
- 每日签到机制
- 自动淘汰机制
- 奖励结算和领取

## 🎨 前端架构

### 目录结构
```
client/
├── app/
│   ├── create/              # 创建活动页面
│   ├── activities/           # 活动库页面
│   ├── all-activities/      # 所有活动页面
│   ├── dashboard/           # 个人仪表板
│   ├── profile/             # 个人档案
│   └── page.tsx             # 主页
├── components/
│   ├── activities/
│   │   ├── CreateActivityForm.tsx    # 创建活动表单
│   │   ├── ActivityCard.tsx          # 活动卡片
│   │   └── ActivityDashboard.tsx     # 活动仪表板
│   └── animations/
│       ├── FadeIn.tsx                # 淡入动画
│       └── ParticleField.tsx        # 粒子场动画
└── lib/
    ├── types.ts                      # TypeScript类型定义
    ├── activityRegistry.ts           # 活动注册表工具函数
    ├── activityStorage.ts            # 本地存储工具
    └── wallet.ts                     # 钱包配置
```

### 核心组件

#### 1. CreateActivityForm
- 活动标题输入
- 活动描述输入
- 押金金额设置
- 挑战天数设置
- 最大参与人数设置

#### 2. ActivityCard
- 活动标题和描述展示
- 创建者信息
- 创建时间
- 公开/私有状态标识

#### 3. ActivityDashboard
- 活动列表展示
- 刷新功能
- 空状态处理

## 📊 数据流

### 创建活动流程
1. 用户填写活动表单
2. 前端验证表单数据
3. 调用 ActivityFactory.createDepositChallenge
4. ActivityFactory 创建 Challenge 合约
5. ActivityFactory 自动注册到 ActivityRegistry
6. 返回活动ID和合约地址
7. 保存到本地存储（localStorage）
8. 跳转到活动列表页面

### 查看活动流程
1. 页面加载时从 ActivityRegistry 读取活动总数
2. 批量获取所有活动的元数据
3. 合并本地存储和链上数据
4. 按创建时间倒序排列
5. 渲染活动列表

### 用户参与流程
1. 用户查看活动详情
2. 调用 Challenge.joinChallenge() 支付押金
3. 每日调用 Challenge.checkIn() 签到
4. 完成挑战后调用 Challenge.claimReward() 领取奖励

## 🔧 技术栈

### 智能合约
- Solidity ^0.8.20
- Hardhat
- Ethers.js

### 前端
- Next.js 14
- React
- TypeScript
- Wagmi (Ethereum React Hooks)
- Viem
- GSAP (动画)

## 📝 部署说明

### 部署步骤
1. 编译合约: `npx hardhat compile`
2. 启动本地网络: `npx hardhat node`
3. 部署合约: `npx hardhat run scripts/deploy-activity-system.ts --network localhost`
4. 更新前端配置中的合约地址
5. 启动前端: `cd client && npm run dev`

### 合约地址配置
所有前端页面都需要配置 `ACTIVITY_FACTORY_ADDRESS`，系统会自动从 ActivityFactory 获取 ActivityRegistry 地址。

## 🔍 调试工具

### 脚本
- `scripts/deploy-activity-system.ts`: 部署合约系统
- `scripts/verify-factory.ts`: 验证 ActivityFactory 初始化
- `scripts/debug_read_activities.ts`: 读取链上活动数据

## 📚 更多信息

- 快速开始: `QUICKSTART.md`
- 智能合约: `contracts/`
- 前端组件: `client/components/activities/`
