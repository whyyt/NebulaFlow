# NebulaFlow 系统架构图

```mermaid
flowchart TB
    subgraph UserLayer["👤 用户 & 钱包层"]
        User["User<br/>(Sponsor / Participant)"]
        Wallet["MetaMask / Wallet Extension<br/>连接钱包、签名交易"]
        User -->|使用浏览器访问| Wallet
    end

    subgraph FrontendLayer["🖥️ 前端层 (Next.js + React + GSAP)"]
        direction TB
        subgraph Pages["主要页面"]
            ActivityHub["Activity Hub<br/>活动库<br/>• 列表展示所有活动<br/>• 按类别过滤<br/>• 创建活动"]
            ActivityDetail["Activity Detail<br/>活动详情页<br/>• 展示活动信息<br/>• 报名/签到/结束活动<br/>• GSAP 动画效果"]
            MyJourney["My Journey<br/>个人档案页<br/>• Professional Web3<br/>• Social Web3<br/>• Lifestyle<br/>• 🏆 已完成活动展示"]
        end
        
        TechStack["Tech Stack<br/>• Next.js App Router<br/>• React<br/>• Tailwind CSS<br/>• GSAP 动画<br/>• Wagmi / Ethers.js"]
        
        Pages --> TechStack
    end

    subgraph ContractLayer["📜 合约层 (Hardhat + Solidity)"]
        direction TB
        ChallengeFactory["ChallengeFactory.sol<br/>活动工厂合约<br/>• createDepositChallenge()<br/>• createNFTChallenge()<br/>• joinChallenge()<br/>• checkIn()<br/>• endChallenge()<br/>• getChallenges()"]
        
        RewardNFT["RewardNFT.sol<br/>NFT 奖励合约<br/>• ERC-721 标准<br/>• mint() 发放 NFT<br/>• tokenURI 获取元数据"]
        
        ChallengeFactory -->|调用 mint()| RewardNFT
    end

    subgraph BlockchainLayer["⛓️ 区块链网络层"]
        direction LR
        LocalDev["Hardhat Node<br/>本地开发环境"]
        Testnet["Testnet<br/>测试网<br/>(Sepolia / Scroll / Base)"]
        Mainnet["Mainnet<br/>主网<br/>(未来部署)"]
    end

    %% 用户与前端交互
    Wallet <-->|连接钱包<br/>签名交易| FrontendLayer
    
    %% 前端与合约交互
    FrontendLayer <-->|调用合约函数<br/>读取链上数据| ContractLayer
    
    %% 合约部署在区块链
    ContractLayer -->|部署合约| BlockchainLayer
    
    %% 主要交互流程
    ActivityHub -.->|1. 创建活动| ChallengeFactory
    ActivityDetail -.->|2. 报名活动<br/>joinChallenge()| ChallengeFactory
    ActivityDetail -.->|3. 每日签到<br/>checkIn()| ChallengeFactory
    ActivityDetail -.->|4. 结束活动<br/>endChallenge()| ChallengeFactory
    ChallengeFactory -.->|5a. 押金模式<br/>分配奖池| User
    ChallengeFactory -.->|5b. NFT 模式<br/>调用 mint()| RewardNFT
    RewardNFT -.->|发放 NFT| User
    ChallengeFactory -.->|6. 获取活动列表<br/>getChallenges()| MyJourney
    MyJourney -.->|分类展示<br/>• 进行中活动卡片<br/>• 已完成 🏆 卡片| User

    %% 样式
    classDef userLayer fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef frontendLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef contractLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef blockchainLayer fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    
    class User,Wallet userLayer
    class ActivityHub,ActivityDetail,MyJourney,TechStack frontendLayer
    class ChallengeFactory,RewardNFT contractLayer
    class LocalDev,Testnet,Mainnet blockchainLayer
```

## 架构说明

### 1. 用户 & 钱包层
- **User**: 发起人(Sponsor)和参与者(Participant)
- **Wallet**: MetaMask等钱包扩展，负责连接钱包和签名交易

### 2. 前端层
- **Activity Hub**: 活动库，展示所有活动，支持创建和过滤
- **Activity Detail**: 活动详情页，支持报名、签到、结束活动等操作
- **My Journey**: 个人档案页，按三个类别展示参与记录
- **Tech Stack**: Next.js + React + Tailwind + GSAP + Wagmi

### 3. 合约层
- **ChallengeFactory**: 核心活动管理合约，处理创建、报名、签到、结束等活动
- **RewardNFT**: NFT奖励合约，基于ERC-721标准

### 4. 区块链网络层
- **Hardhat Node**: 本地开发环境
- **Testnet**: 测试网环境
- **Mainnet**: 主网环境（未来部署）

### 主要交互流程
1. **创建活动**: Activity Hub → ChallengeFactory.createDepositChallenge() / createNFTChallenge()
2. **报名活动**: Activity Detail → ChallengeFactory.joinChallenge()
3. **每日签到**: Activity Detail → ChallengeFactory.checkIn()
4. **结束活动**: Activity Detail → ChallengeFactory.endChallenge()
5. **分配奖励**: 
   - 押金模式：ChallengeFactory 直接分配奖池
   - NFT模式：ChallengeFactory → RewardNFT.mint()
6. **展示记录**: ChallengeFactory.getChallenges() → My Journey 分类展示






