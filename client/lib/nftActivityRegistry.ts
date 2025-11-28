// NFT Activity Registry - 完全独立的 ABI 定义
// 与 activityRegistry.ts 完全独立，不共享任何代码

export const NFT_ACTIVITY_ABI = [
  {
    type: "function",
    name: "joinActivity",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "checkIn",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "startActivity",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "endActivity",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "viewStatus",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getParticipantInfo",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [
      { name: "joined", type: "bool", internalType: "bool" },
      { name: "eliminated", type: "bool", internalType: "bool" },
      { name: "lastCheckInRound", type: "uint256", internalType: "uint256" },
      { name: "rewardClaimed", type: "bool", internalType: "bool" },
      { name: "isWinner", type: "bool", internalType: "bool" },
      { name: "hasCheckedIn", type: "bool", internalType: "bool" },
      { name: "isCompleted", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "participantCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCurrentRound",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "title",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "description",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "createdAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "startTime",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalRounds",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxParticipants",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "ParticipantJoined",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "totalParticipants", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  },
  {
    type: "event",
    name: "CheckIn",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "day", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  },
  {
    type: "event",
    name: "Eliminated",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "missedRound", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "winners", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  }
] as const;

export const NFT_ACTIVITY_FACTORY_ABI = [
  {
    type: "function",
    name: "createNFTActivity",
    inputs: [
      { name: "_title", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      { name: "_totalRounds", type: "uint256", internalType: "uint256" },
      { name: "_maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "_isPublic", type: "bool", internalType: "bool" },
      { name: "_creatorName", type: "string", internalType: "string" }
    ],
    outputs: [
      { name: "activityAddress", type: "address", internalType: "address" },
      { name: "activityId", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "activityRegistry",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getAllNFTActivities",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "nftActivityCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "NFTActivityCreated",
    inputs: [
      { name: "activityAddress", type: "address", indexed: true, internalType: "address" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "activityId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "title", type: "string", indexed: false, internalType: "string" }
    ]
  }
] as const;

