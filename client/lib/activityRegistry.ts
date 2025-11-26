import { ActivityRegistry } from "../../typechain-types";
import { ActivityMetadata } from "./types";

// ActivityRegistry ABI (简化版，实际应从合约生成)
export const ACTIVITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerActivity",
    inputs: [
      { name: "_activityContract", type: "address", internalType: "address" },
      { name: "_title", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      { name: "_isPublic", type: "bool", internalType: "bool" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "addUserActivity",
    inputs: [
      { name: "_user", type: "address", internalType: "address" },
      { name: "_activityContract", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getUserActivities",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "activityCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getActivityMetadata",
    inputs: [
      { 
        name: "_activityId", 
        type: "uint256", 
        internalType: "uint256" 
      }
    ],
    outputs: [
      { name: "activityContract", type: "address", internalType: "address" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "title", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "isPublic", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getActivityMetadataTuple",
    inputs: [
      { 
        name: "_activityId", 
        type: "uint256", 
        internalType: "uint256" 
      }
    ],
    outputs: [
      { name: "activityContract", type: "address", internalType: "address" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "title", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "isPublic", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "contractToActivity",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "ActivityRegistered",
    inputs: [
      { name: "activityId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "activityContract", type: "address", indexed: false, internalType: "address" },
      { name: "title", type: "string", indexed: false, internalType: "string" }
    ]
  }
] as const;

// ActivityFactory ABI
export const ACTIVITY_FACTORY_ABI = [
  {
    type: "function",
    name: "activityRegistry",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "createDepositChallenge",
    inputs: [
      { name: "_title", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      { name: "_depositAmount", type: "uint256", internalType: "uint256" },
      { name: "_totalRounds", type: "uint256", internalType: "uint256" },
      { name: "_maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "_isPublic", type: "bool", internalType: "bool" }
    ],
    outputs: [
      { name: "challengeAddress", type: "address", internalType: "address" },
      { name: "activityId", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getAllChallenges",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "challengeCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "challenges",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "DepositChallengeCreated",
    inputs: [
      { name: "challengeAddress", type: "address", indexed: true, internalType: "address" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "activityId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "title", type: "string", indexed: false, internalType: "string" }
    ]
  },
] as const;

// Challenge 合约 ABI
export const CHALLENGE_ABI = [
  {
    type: "function",
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "status",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "enum Challenge.Status" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "viewStatus",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "enum Challenge.Status" }],
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
    name: "depositAmount",
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
    type: "function",
    name: "participantCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "forceStart",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "forceEnd",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "joinChallenge",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "getParticipantInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
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
    name: "checkIn",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "currentRound",
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
    name: "rewardPerWinner",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "winnersCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
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
    name: "Distributed",
    inputs: [
      { name: "total", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "perUser", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  },
  {
    type: "event",
    name: "ParticipantJoined",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      { name: "totalParticipants", type: "uint256", indexed: false, internalType: "uint256" }
    ]
  }
] as const;

// 辅助函数：获取活动元数据
export async function getActivityMetadata(
  registry: ActivityRegistry,
  activityId: bigint
): Promise<ActivityMetadata> {
  const metadata = await registry.getActivityMetadata(activityId);
  return {
    activityContract: metadata.activityContract,
    creator: metadata.creator,
    title: metadata.title,
    description: metadata.description,
    createdAt: metadata.createdAt,
    isPublic: metadata.isPublic
  };
}

