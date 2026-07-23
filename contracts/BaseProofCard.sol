// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BaseProofCard is ERC721, Ownable, Pausable {
    using Strings for uint256;

    struct Profile {
        string nickname;
        string bio;
        string avatarURI;
    }

    struct Stats {
        uint256 likes;
        uint256 confirms;
    }

    uint256 public totalSupply;
    string private baseTokenURI;

    mapping(address => Profile) private profiles;
    mapping(uint256 => Stats) private stats;
    mapping(address => uint256) public cardCount;
    mapping(address => uint256) public rewardPoints;
    mapping(address => address) public referrers;

    event Activity(address indexed user, uint256 indexed tokenId, string action);

    constructor(string memory initialBaseURI) ERC721("BaseProof Card", "BPC") Ownable(msg.sender) {
        baseTokenURI = initialBaseURI;
    }

    function mint(
        string calldata nickname,
        string calldata bio,
        string calldata avatarURI,
        address referrer
    ) external whenNotPaused returns (uint256 tokenId) {
        _saveProfile(msg.sender, nickname, bio, avatarURI);
        _refer(msg.sender, referrer);
        tokenId = ++totalSupply;
        _safeMint(msg.sender, tokenId);
        cardCount[msg.sender]++;
        rewardPoints[msg.sender] += 10;
        emit Activity(msg.sender, tokenId, "mint");
    }

    function updateProfile(
        uint256 tokenId,
        string calldata nickname,
        string calldata bio,
        string calldata avatarURI,
        address referrer
    ) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        _saveProfile(msg.sender, nickname, bio, avatarURI);
        _refer(msg.sender, referrer);
        rewardPoints[msg.sender] += 4;
        emit Activity(msg.sender, tokenId, "update");
    }

    function like(uint256 tokenId, address referrer) external whenNotPaused {
        ownerOf(tokenId);
        _refer(msg.sender, referrer);
        stats[tokenId].likes++;
        rewardPoints[msg.sender] += 2;
        emit Activity(msg.sender, tokenId, "like");
    }

    function confirm(uint256 tokenId, address referrer) external whenNotPaused {
        ownerOf(tokenId);
        _refer(msg.sender, referrer);
        stats[tokenId].confirms++;
        rewardPoints[msg.sender] += 3;
        emit Activity(msg.sender, tokenId, "confirm");
    }

    function getProfile(address user)
        external
        view
        returns (
            string memory nickname,
            string memory bio,
            string memory avatarURI,
            uint256 cards,
            uint256 points,
            address referrer
        )
    {
        require(user != address(0), "zero user");
        Profile storage profile = profiles[user];
        return (profile.nickname, profile.bio, profile.avatarURI, cardCount[user], rewardPoints[user], referrers[user]);
    }

    function getTokenStats(uint256 tokenId) external view returns (uint256 likes, uint256 confirms) {
        ownerOf(tokenId);
        Stats storage s = stats[tokenId];
        return (s.likes, s.confirms);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        return string.concat(baseTokenURI, tokenId.toString(), ".json");
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _saveProfile(address user, string calldata nickname, string calldata bio, string calldata avatarURI) private {
        require(bytes(nickname).length > 0 && bytes(nickname).length <= 64, "bad nickname");
        require(bytes(bio).length <= 280 && bytes(avatarURI).length <= 300, "too long");
        profiles[user] = Profile(nickname, bio, avatarURI);
    }

    function _refer(address user, address referrer) private {
        if (referrer != address(0) && referrers[user] == address(0)) {
            referrers[user] = referrer;
            rewardPoints[user] += 5;
            rewardPoints[referrer] += 5;
        }
    }
}
