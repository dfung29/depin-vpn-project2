// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ClearNetRegistry
/// @notice Registry for node operators with staking, pricing, and reputation.
contract ClearNetRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Node {
        address nodeID;           // Operator's wallet address
        string metadataURI;       // Off-chain info (e.g., IP:port) 
        bytes32 metadataHash;     // Integrity hash of the metadata
        uint256 stakeAmount;
        uint256 reputationScore;
        uint256 pricePerMinute;   // Price in CLR tokens per minute
        bool isActive;
    }
    
    // State variables
    mapping(address => Node) public nodes;
    address[] public activeNodeIds;
    mapping(address => uint256) private activeNodeIndex; // index in activeNodeIds array

    uint256 public constant MIN_STAKE = 1000 * 10**18;          // 1000 CLR tokens
    uint256 public constant MIN_PRICE_PER_MIN = 1 * 10**16;     // 0.01 CLR minimum
    uint256 public constant MAX_PRICE_PER_MIN = 100 * 10**18;   // 100 CLR minimum
    uint256 public constant REPUTATION_DECAY_PERIOD = 30 days;  // Period for reputation decay


    // Events
    event NodeRegistered(
      address indexed nodeID, 
      string metadataURI, 
      uint256 pricePerMinute,
      uint256 stakeAmount
    );
    event NodeMetadataUpdated(address indexed nodeID, string newMetadataURI);
    event NodeDeregistered(address indexed nodeID, uint256 returnedStake);
    event ReputationUpdated(address indexed nodeID, uint256 newScore);
    event NodePriceUpdated(address indexed nodeID, uint256 newPricePerMinute);

    // Errors
    error NodeAlreadyRegistered();
    error NodeNotRegistered();
    error InvalidMetadataURI();
    error PriceOutOfBounds();
    error InvalidToken();

    IERC20 public clrToken;

    // If using OpenZeppelin v4, remove (msg.sender) from Ownable(...)
    constructor(address _clrToken) Ownable(msg.sender) {
        if (_clrToken == address(0)) revert InvalidToken();
        clrToken = IERC20(_clrToken);
    }

    // ========== NODE REGISTRATION & MANAGEMENT ==========
    function registerNode(
        string calldata _metadataURI,
        bytes32 _metadataHash,
        uint256 _pricePerMinute
    ) external nonReentrant {
        require(!nodes[msg.sender].isActive, "Node already registered");
        require(bytes(_metadataURI).length > 0, "Metadata URI required");
        require(_pricePerMinute >= MIN_PRICE_PER_MIN && _pricePerMinute <= MAX_PRICE_PER_MIN, "Price out of bounds");
        // Transfer stake from node operator
        clrToken.safeTransferFrom(msg.sender, address(this), MIN_STAKE);

        nodes[msg.sender] = Node({
            nodeID: msg.sender,
            metadataURI: _metadataURI,
            metadataHash: _metadataHash,
            stakeAmount: MIN_STAKE,
            reputationScore: 100,
            pricePerMinute: _pricePerMinute,
            isActive: true
        });

        activeNodeIndex[msg.sender] = activeNodeIds.length;
        activeNodeIds.push(msg.sender);
        emit NodeRegistered(msg.sender, _metadataURI, _pricePerMinute, MIN_STAKE);
    }

    function updateMetadata(
      string memory _newMetadataURI, 
      bytes32 _newMetadataHash
    ) external {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");
        require(bytes(_newMetadataURI).length > 0, "Metadata URI required");

        node.metadataURI = _newMetadataURI;
        node.metadataHash = _newMetadataHash;

        emit NodeMetadataUpdated(msg.sender, _newMetadataURI);
    }

    function deregisterNode() external nonReentrant {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");

        uint256 returnedStake = node.stakeAmount;
        node.isActive = false;
        node.stakeAmount = 0;

        // Remove from activeNodeIds
        for (uint256 i = 0; i < activeNodeIds.length; i++) {
            if (activeNodeIds[i] == msg.sender) {
                activeNodeIds[i] = activeNodeIds[activeNodeIds.length - 1];
                activeNodeIds.pop();
                break;
            }
        }

        // Return stake to node operator
        clrToken.safeTransfer(msg.sender, returnedStake);

        emit NodeDeregistered(msg.sender, returnedStake);
    }

    function updatePrice(
      uint256 _newPricePerMinute
    ) external {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");
        require(_newPricePerMinute >= MIN_PRICE_PER_MIN && _newPricePerMinute <= MAX_PRICE_PER_MIN, "Price out of bounds");

        node.pricePerMinute = _newPricePerMinute;
        emit NodePriceUpdated(msg.sender, _newPricePerMinute);
    }

    // ========== REPUTATION MANAGEMENT ==========
    function updateReputation(
      address _nodeID, 
      uint256 _newScore,
      bool _successfulSession
    ) external onlyOwner {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not registered");

        if (_successfulSession) {
            // Increase reputation for successful session
            node.reputationScore = min(node.reputationScore + 5, 100);
        } else {
            // Decrease reputation for failed session
            node.reputationScore = max(node.reputationScore > 10 ? node.reputationScore - 10 : 0, 0);
        } 

        emit ReputationUpdated(_nodeID, node.reputationScore);
    } 

    // ========== VIEW FUNCTIONS ==========
    function getActiveNodes() external view returns (
      address[] memory) {
        return activeNodeIds;
    } 

    function getNodeConnectionInfo(address _nodeID) external view returns (
      string memory, uint256, uint256) {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not registered");
        return (node.metadataURI, node.pricePerMinute, node.reputationScore);
    } 

    // ========== INTERNAL UTILITIES ==========
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}