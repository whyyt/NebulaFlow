// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFT Reward Contract - 用于活动参与证明和奖励
/// @notice 支持POAP、Badge、动态元数据等不同类型的NFT
contract NFTReward is ERC721URIStorage, Ownable {
    enum NFTType {
        POAP,           // 0: 参与证明（一次性活动）
        Badge,          // 1: 成就徽章（完成证明）
        Dynamic,        // 2: 动态NFT（可更新元数据）
        Completion      // 3: 完成证明（用于Lifestyle活动）
    }

    struct NFTMetadata {
        NFTType nftType;
        uint256 activityId;
        string title;
        string description;
        uint256 mintedAt;
        bool isVerified;
    }

    uint256 private _tokenIds;
    
    // tokenId => NFTMetadata
    mapping(uint256 => NFTMetadata) public tokenMetadata;
    
    // user => tokenIds[] (用户拥有的NFT)
    mapping(address => uint256[]) public userTokens;
    
    // activityId => tokenIds[] (活动关联的NFT)
    mapping(uint256 => uint256[]) public activityTokens;
    
    // user => activityId => tokenId (快速查找)
    mapping(address => mapping(uint256 => uint256)) public userActivityToken;

    string public baseTokenURI;
    address public activityRegistry;
    uint256 public activityId;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed to,
        NFTType nftType,
        uint256 activityId,
        string tokenURI
    );

    event NFTMetadataUpdated(
        uint256 indexed tokenId,
        string newTokenURI
    );

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        address _activityRegistry,
        uint256 _activityId,
        address _creator
    ) ERC721(_name, _symbol) Ownable(_creator) {
        baseTokenURI = _baseTokenURI;
        activityRegistry = _activityRegistry;
        activityId = _activityId;
    }

    /// @notice 内部铸造函数
    function _mintNFT(
        address _to,
        NFTType _nftType,
        string memory _title,
        string memory _description,
        string memory _tokenURI
    ) internal returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(_to, newTokenId);
        
        if (bytes(_tokenURI).length > 0) {
            _setTokenURI(newTokenId, _tokenURI);
        } else {
            _setTokenURI(newTokenId, string(abi.encodePacked(baseTokenURI, "/", _toString(newTokenId))));
        }

        tokenMetadata[newTokenId] = NFTMetadata({
            nftType: _nftType,
            activityId: activityId,
            title: _title,
            description: _description,
            mintedAt: block.timestamp,
            isVerified: true
        });

        userTokens[_to].push(newTokenId);
        activityTokens[activityId].push(newTokenId);
        userActivityToken[_to][activityId] = newTokenId;

        emit NFTMinted(newTokenId, _to, _nftType, activityId, _tokenURI);

        return newTokenId;
    }

    /// @notice 铸造NFT（由活动组织者或验证系统调用）
    function mint(
        address _to,
        NFTType _nftType,
        string memory _title,
        string memory _description,
        string memory _tokenURI
    ) external onlyOwner returns (uint256) {
        return _mintNFT(_to, _nftType, _title, _description, _tokenURI);
    }

    /// @notice 批量铸造NFT
    function batchMint(
        address[] memory _recipients,
        NFTType _nftType,
        string memory _title,
        string memory _description,
        string[] memory _tokenURIs
    ) external onlyOwner {
        require(_recipients.length == _tokenURIs.length, "ARRAY_LENGTH_MISMATCH");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            _mintNFT(_recipients[i], _nftType, _title, _description, _tokenURIs[i]);
        }
    }

    /// @notice 更新NFT元数据（仅对Dynamic类型有效）
    function updateTokenURI(uint256 _tokenId, string memory _newTokenURI) external onlyOwner {
        require(_ownerOf(_tokenId) != address(0), "TOKEN_NOT_EXISTS");
        require(tokenMetadata[_tokenId].nftType == NFTType.Dynamic, "NOT_DYNAMIC_NFT");
        
        _setTokenURI(_tokenId, _newTokenURI);
        emit NFTMetadataUpdated(_tokenId, _newTokenURI);
    }

    /// @notice 获取用户拥有的所有NFT ID
    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    /// @notice 获取活动关联的所有NFT ID
    function getActivityTokens(uint256 _activityId) external view returns (uint256[] memory) {
        return activityTokens[_activityId];
    }

    /// @notice 获取用户在特定活动中获得的NFT ID
    function getUserActivityToken(address _user, uint256 _activityId) external view returns (uint256) {
        return userActivityToken[_user][_activityId];
    }

    /// @notice 获取NFT的完整元数据
    function getNFTMetadata(uint256 _tokenId) external view returns (NFTMetadata memory) {
        require(_ownerOf(_tokenId) != address(0), "TOKEN_NOT_EXISTS");
        return tokenMetadata[_tokenId];
    }

    /// @notice 设置基础URI
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
    }

    /// @notice 辅助函数：将uint256转换为string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

