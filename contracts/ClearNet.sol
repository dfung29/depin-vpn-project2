// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ClearNet - P2P VPN Node Registry & Payment System
/// @notice Handles node registry, staking, and transparent payment system

contract ClearNet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========== STRUCTS ==========

    struct Node {
        string ipAddress;           // Note IP stored on-chain. (Consider encryption for privacy in future)
        uint16 port;                // Port number of the node
        bool isActive;
        uint256 stakeAmount;
        uint256 reputationScore;    // Reputation score scaled by REPUTATION_PRECISION (0-5000 = 0.000-5.000)
        uint256 pricePerMinute;     // Price in CLR tokens per minute
        uint256 totalMinutesServed;
        uint256 totalEarnings;
        uint256 lastActivity;
    }
    
    // Payment channel for users
    struct PaymentChannel {
        uint256 balance;            // CLR tokens deposited
        uint256 nonce;              // To prevent replay attacks
        bool isActive;
    }   


    // ========== STATE VARIABLES ==========

    IERC20 public clrToken;
    address public governanceContract;

    mapping(address => Node) public nodes;
    mapping(address => PaymentChannel) public paymentChannels;
    mapping(bytes32 => bool) public usedSignatures; // To prevent replay attacks
    mapping(address => bool) public relayOperators; // Authorized relays nodes

    address[] public activeNodeIds;
    mapping(address => uint256) private activeNodeIndex; // index in activeNodeIds array

    // Protocol fee distribution (85-10-5)
    uint256 public constant NODE_SHARE = 850;           // 85.0%
    uint256 public constant TREASURY_SHARE = 100;       // 10.0%
    uint256 public constant RELAY_SHARE = 50;           // 5.0%
    uint256 public constant SHARE_DENOMINATOR = 1000;   // Denominator for fee percentages

    // Node requirements
    uint256 public constant MIN_STAKE = 1000 * 10**18;          // 1000 CLR tokens
    uint256 public constant MIN_PRICE_PER_MIN = 1 * 10**16;     // 0.01 CLR tokens minimum
    uint256 public constant MAX_PRICE_PER_MIN = 100 * 10**18;   // 100 CLR tokens minimum
    uint256 public constant MIN_STAKE_THRESHOLD = MIN_STAKE / 2; // Minimum stake before deregistration
    uint256 public constant MIN_CHANNEL_BALANCE = 10 * 10**18;  // 10 CLR minimum
    uint256 public constant MAX_MINUTES_PER_PAYMENT = 10080;     // 1 week max
    
    // Reputation system (scaled by 1000 for 3 decimal precision)
    uint256 public constant REPUTATION_PRECISION = 1000;
    uint256 public constant INITIAL_REPUTATION = 3000;          // 3.000
    uint256 public constant MAX_REPUTATION = 5000;              // 5.000
    uint256 public constant REPUTATION_INCREMENT = 1;           // 0.001 per successful session
    uint256 public constant REPUTATION_DECREMENT = 10;          // 0.010 per failed session
    
    // Protocol statistics
    uint256 public totalBandwidthMinutes;  // Total bandwidth minutes served
    uint256 public totalProtocolFees;      // Total protocol fees collected
    
    // Emergency controls
    bool public paused;
    address public pendingGovernance;       // For two-step governance transfer


    // ============ EVENTS ============
    
    event NodeRegistered(
      address indexed nodeID, 
      string ipAddress, 
      uint16 port,
      uint256 pricePerMinute,
      uint256 stakeAmount
    );
    event NodeUpdated(address indexed nodeID, string newIp, uint16 newPort);
    event NodeDeregistered(address indexed nodeID, uint256 returnedStake);
    event ReputationUpdated(address indexed nodeID, uint256 newScore);
    event NodePriceUpdated(address indexed nodeID, uint256 newPricePerMinute);

    // Payment events
    event PaymentChannelOpened(address indexed client, uint256 amount);
    event PaymentChannelToppedUp(address indexed client, uint256 amount, uint256 newBalance);
    event PaymentProcessed(
        address indexed client, 
        address indexed nodeID, 
        uint256 amount, 
        uint256 minutesUsed,
        uint256 nodeShare,
        uint256 treasuryShare,
        uint256 relayShare
    );
    event PaymentChannelClosed(address indexed client, uint256 refundAmount);
    event RelayOperatorAdded(address indexed relay);
    event RelayOperatorRemoved(address indexed relay);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event GovernanceTransferInitiated(address indexed currentGovernance, address indexed pendingGovernance);
    event GovernanceTransferred(address indexed previousGovernance, address indexed newGovernance);
    event NodeSlashed(address indexed nodeID, uint256 slashAmount, uint256 remainingStake);

    // ============ MODIFIERS ============

    modifier onlyGovernance() {
        require(governanceContract != address(0), "Governance not set");
        require(msg.sender == governanceContract, "Only governance can call");
        _;
    }

    modifier onlyRelay() {
        require(relayOperators[msg.sender], "Only authorized relays can call");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // ========== CONSTRUCTOR ==========

    constructor(address _clrToken) Ownable(msg.sender) {     // If using OpenZeppelin v4, remove (msg.sender) from Ownable(...)
        require(_clrToken != address(0), "Invalid CLR token address");
        clrToken = IERC20(_clrToken);
    }

    // ========== NODE REGISTRATION ==========

    /// @notice Register a new VPN node
    /// @param _ipAddress IP address of the node
    /// @param _port Port number of the node
    /// @param _pricePerMinute Price per minute in CLR tokens
    function registerNode(
        string calldata _ipAddress,
        uint16 _port,
        uint256 _pricePerMinute
    ) external nonReentrant whenNotPaused {
        require(!nodes[msg.sender].isActive, "Node already registered");
        require(bytes(_ipAddress).length > 0, "IP address required");
        require(_port > 0 && _port <= 65535, "Invalid port number");
        require(
            _pricePerMinute >= MIN_PRICE_PER_MIN && _pricePerMinute <= MAX_PRICE_PER_MIN, "Price out of bounds");
  
        // Transfer stake from node operator
        clrToken.safeTransferFrom(msg.sender, address(this), MIN_STAKE);

        nodes[msg.sender] = Node({
            ipAddress: _ipAddress,
            port: _port,
            isActive: true,
            stakeAmount: MIN_STAKE,
            reputationScore: INITIAL_REPUTATION, // Start with 3.000 reputation
            pricePerMinute: _pricePerMinute,
            totalMinutesServed: 0,
            totalEarnings: 0,
            lastActivity: block.timestamp
        });

        activeNodeIndex[msg.sender] = activeNodeIds.length;
        activeNodeIds.push(msg.sender);
        emit NodeRegistered(
            msg.sender, 
            _ipAddress, 
            _port, 
            _pricePerMinute, 
            MIN_STAKE
        );
    }

    function updateNodeInfo(
        string calldata _newIpAddress, 
        uint16 _newPort
    ) external {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");
        require(bytes(_newIpAddress).length > 0, "IP address required");
        require(_newPort > 0 && _newPort <= 65535, "Invalid port number");

        node.ipAddress = _newIpAddress;
        node.port = _newPort;
        node.lastActivity = block.timestamp;

        emit NodeUpdated(msg.sender, _newIpAddress, _newPort);
    }

    /// @notice Deregister a node and return stake
    function deregisterNode() external nonReentrant {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");

        uint256 returnedStake = node.stakeAmount;
        node.isActive = false;
        node.stakeAmount = 0;

        _removeFromActiveNodes(msg.sender);

        // Return stake to node operator
        clrToken.safeTransfer(msg.sender, returnedStake);

        emit NodeDeregistered(msg.sender, returnedStake);
    }

    function updatePrice(uint256 _newPricePerMinute) external {
        Node storage node = nodes[msg.sender];
        require(node.isActive, "Node not registered");
        require(
            _newPricePerMinute >= MIN_PRICE_PER_MIN && _newPricePerMinute <= MAX_PRICE_PER_MIN, "Price out of bounds");

        node.pricePerMinute = _newPricePerMinute;
        node.lastActivity = block.timestamp;
        emit NodePriceUpdated(msg.sender, _newPricePerMinute);
    }

    // ========== PAYMENT SYSTEM ==========
    
    /// @notice Open a payment channel by depositing CLR tokens
    /// @param _amount Amount of CLR tokens to deposit
    function openPaymentChannel(uint256 _amount) external nonReentrant whenNotPaused {
        PaymentChannel storage channel = paymentChannels[msg.sender];
        require(!channel.isActive, "Channel already active");
        require(_amount >= MIN_CHANNEL_BALANCE, "Amount below minimum");

        // Transfer CLR tokens from client to contract
        clrToken.safeTransferFrom(msg.sender, address(this), _amount);

        channel.balance = _amount;
        channel.nonce = 0;
        channel.isActive = true;

        emit PaymentChannelOpened(msg.sender, _amount);
    }

    /// @notice Top up an existing payment channel
    /// @param _amount Amount of CLR tokens to add
    function topUpPaymentChannel(uint256 _amount) external nonReentrant whenNotPaused {
        PaymentChannel storage channel = paymentChannels[msg.sender];
        require(channel.isActive, "Channel not active");
        require(_amount > 0, "Amount must be greater than zero");

        clrToken.safeTransferFrom(msg.sender, address(this), _amount);
        channel.balance += _amount;

        emit PaymentChannelToppedUp(msg.sender, _amount, channel.balance);
    }

    /// @notice Process payment for VPN usage with signature verification
    /// @param _client Client address
    /// @param _node Node address
    /// @param _minutesUsed Minutes of VPN usage
    /// @param _nonce Nonce for replay protection
    /// @param _clientSignature Client's signature
    /// @param _nodeSignature Node's signature
    /// @param _relaySignature Relay's signature
    function processPayment(
        address _client,
        address _node,
        uint256 _minutesUsed,
        uint256 _nonce,
        bytes calldata _clientSignature,
        bytes calldata _nodeSignature,
        bytes calldata _relaySignature
    ) external nonReentrant onlyRelay whenNotPaused {
        // Prevent replay attacks and verify signatures
        bytes32 messageHash = keccak256(abi.encodePacked(
            _client, 
            _node, 
            _minutesUsed, 
            _nonce,
            block.chainid,
            address(this)
        ));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", 
            messageHash
        ));

        require(!usedSignatures[ethSignedMessageHash], "Signature already used");
        
        // Verify all three signatures
        require(_verifySignature(ethSignedMessageHash, _clientSignature, _client), "Invalid client signature");
        require(_verifySignature(ethSignedMessageHash, _nodeSignature, _node), "Invalid node signature");
        require(_verifySignature(ethSignedMessageHash, _relaySignature, msg.sender), "Invalid relay signature");
        
        usedSignatures[ethSignedMessageHash] = true;

        // Validate inputs
        require(_minutesUsed > 0 && _minutesUsed <= MAX_MINUTES_PER_PAYMENT, "Invalid minutes");

        // Verify node is active
        Node storage node = nodes[_node];
        require(node.isActive, "Node not active");

        // Verify payment channel exists and has sufficient balance
        PaymentChannel storage channel = paymentChannels[_client];
        require(channel.isActive, "No active channel");
        require(channel.nonce < _nonce, "Invalid nonce");

        // Calculate total cost
        uint256 totalCost = node.pricePerMinute * _minutesUsed;
        require(totalCost <= channel.balance, "Insufficient balance");

        // Update payment channel state
        channel.balance -= totalCost;
        channel.nonce = _nonce;

        // Calculate distribution (85-10-5)
        uint256 nodeShare = (totalCost * NODE_SHARE) / SHARE_DENOMINATOR;
        uint256 treasuryShare = (totalCost * TREASURY_SHARE) / SHARE_DENOMINATOR;
        uint256 relayShare = (totalCost * RELAY_SHARE) / SHARE_DENOMINATOR;

        // Update node statistics
        node.totalMinutesServed += _minutesUsed;
        node.totalEarnings += nodeShare;
        
        // Increase reputation (scaled)
        if (node.reputationScore < MAX_REPUTATION) {
            node.reputationScore = min(node.reputationScore + REPUTATION_INCREMENT, MAX_REPUTATION);
        }
        node.lastActivity = block.timestamp;

        // Update protocol statistics
        totalBandwidthMinutes += _minutesUsed;
        totalProtocolFees += treasuryShare;

        // Transfer funds
        clrToken.safeTransfer(_node, nodeShare);        // 85.0% to node
        clrToken.safeTransfer(msg.sender, relayShare);  // 5.0% to relay
        // Treasury share remains in contract for governance use

        emit PaymentProcessed(
            _client, 
            _node, 
            totalCost, 
            _minutesUsed,
            nodeShare,
            treasuryShare,
            relayShare
        );

        emit ReputationUpdated(_node, node.reputationScore);
    }   

    function closePaymentChannel() external nonReentrant {
        PaymentChannel storage channel = paymentChannels[msg.sender];
        require(channel.isActive, "Channel not active");

        uint256 refundAmount = channel.balance;
        channel.balance = 0;        // Prevent re-entrancy
        channel.isActive = false;   // Mark channel as closed

        // Refund remaining balance to client
        if (refundAmount > 0) {
            clrToken.safeTransfer(msg.sender, refundAmount);
        }

        emit PaymentChannelClosed(msg.sender, refundAmount);
    }

    // ========= RELAY MANAGEMENT ==========
    
    /// @notice Add a relay operator
    /// @param _relay Address of the relay operator
    function addRelayOperator(address _relay) external onlyOwner {
        require(_relay != address(0), "Invalid relay address");
        require(!relayOperators[_relay], "Relay already added");
        relayOperators[_relay] = true;
        emit RelayOperatorAdded(_relay);
    }

    /// @notice Remove a relay operator
    /// @param _relay Address of the relay operator
    function removeRelayOperator(address _relay) external onlyOwner {
        require(relayOperators[_relay], "Relay not found");
        relayOperators[_relay] = false;
        emit RelayOperatorRemoved(_relay);
    }

    // ========== GOVERNANCE INTEGRATION ==========

    /// @notice Initiate governance contract transfer (step 1 of 2)
    /// @param _newGovernance Address of the new governance contract
    function initiateGovernanceTransfer(address _newGovernance) external onlyOwner {
        require(_newGovernance != address(0), "Invalid governance address");
        require(_newGovernance != governanceContract, "Same as current governance");
        pendingGovernance = _newGovernance;
        emit GovernanceTransferInitiated(governanceContract, _newGovernance);
    }

    /// @notice Accept governance contract transfer (step 2 of 2)
    function acceptGovernanceTransfer() external {
        require(msg.sender == pendingGovernance, "Not pending governance");
        address oldGovernance = governanceContract;
        governanceContract = pendingGovernance;
        pendingGovernance = address(0);
        emit GovernanceTransferred(oldGovernance, governanceContract);
    }

    function withdrawTreasuryFunds(uint256 _amount) external onlyGovernance nonReentrant {
        require(_amount <= totalProtocolFees, "Insufficient treasury balance");
        require(_amount <= clrToken.balanceOf(address(this)), "Insufficient contract balance");

        totalProtocolFees -= _amount; // Update protocol fees
        clrToken.safeTransfer(governanceContract, _amount);
    }

    // ========== REPUTATION MANAGEMENT ==========
    
    /// @notice Update node reputation based on session success
    /// @param _nodeID Node address
    /// @param _successfulSession Whether the session was successful
    function updateReputation(
      address _nodeID, 
      bool _successfulSession
    ) external onlyRelay {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not active");

        if (_successfulSession) {
            // Increase reputation for successful session (0.001)
            node.reputationScore = min(node.reputationScore + REPUTATION_INCREMENT, MAX_REPUTATION);
        } else {
            // Decrease reputation for failed session (0.010)
            if (node.reputationScore >= REPUTATION_DECREMENT) {
                node.reputationScore -= REPUTATION_DECREMENT;
            } else {
                node.reputationScore = 0;
            }
        } 

        node.lastActivity = block.timestamp;
        emit ReputationUpdated(_nodeID, node.reputationScore);
    } 

    /// @notice Slash a node's stake for misbehavior
    /// @param _nodeID Node address
    /// @param _slashAmount Amount to slash
    function slashNode(
        address _nodeID, 
        uint256 _slashAmount   
    ) external onlyOwner nonReentrant {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not active");
        require(_slashAmount > 0 && _slashAmount <= node.stakeAmount, "Invalid slash amount");

        node.stakeAmount -= _slashAmount;
        totalProtocolFees += _slashAmount;  // Add slashed amount to protocol fees

        emit NodeSlashed(_nodeID, _slashAmount, node.stakeAmount);

        // If stake falls below minimum threshold, deregister node
        if (node.stakeAmount < MIN_STAKE_THRESHOLD) {
            uint256 remainingStake = node.stakeAmount;
            node.isActive = false;
            node.stakeAmount = 0;
            
            _removeFromActiveNodes(_nodeID);
            emit NodeDeregistered(_nodeID, remainingStake);
        }
    }

    // ========== VIEW FUNCTIONS ==========
    
    function getActiveNodes() external view returns (address[] memory) {
        return activeNodeIds;
    } 

    function getNodeInfo(address _nodeID) external view returns (
      string memory ipAddress, 
      uint16 port,
      uint256 pricePerMinute,
      uint256 reputationScore,
      uint256 totalMinutesServed,
      uint256 totalEarnings
    ) {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not active");
        return (
            node.ipAddress, 
            node.port, 
            node.pricePerMinute, 
            node.reputationScore,
            node.totalMinutesServed,
            node.totalEarnings
        );
    }

    function calculateCost(
        address _nodeID, 
        uint256 _minutesUsed
    ) external view returns (uint256) {
        Node storage node = nodes[_nodeID];
        require(node.isActive, "Node not active");
        return node.pricePerMinute * _minutesUsed;
    }

    /// @notice Check if address is a relay operator
    /// @param _address Address to check
    /// @return bool True if address is relay operator
    function isRelayOperator(address _address) external view returns (bool) {
        return relayOperators[_address];
    }

    /// @notice Get payment channel information
    /// @param _client Client address
    /// @return balance Current balance
    /// @return nonce Current nonce
    /// @return isActive Whether channel is active
    function getPaymentChannelInfo(address _client) external view returns (
        uint256 balance,
        uint256 nonce,
        bool isActive
    ) {
        PaymentChannel storage channel = paymentChannels[_client];
        return (channel.balance, channel.nonce, channel.isActive);
    }

    /// @notice Get paginated list of active nodes
    /// @param _offset Starting index
    /// @param _limit Number of nodes to return
    /// @return nodes Array of node addresses
    /// @return total Total number of active nodes
    function getActiveNodesPaginated(uint256 _offset, uint256 _limit) external view returns (
        address[] memory nodes,
        uint256 total
    ) {
        total = activeNodeIds.length;
        if (_offset >= total) {
            return (new address[](0), total);
        }

        uint256 end = _offset + _limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - _offset;
        nodes = new address[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            nodes[i] = activeNodeIds[_offset + i];
        }

        return (nodes, total);
    }

    // ========== EMERGENCY CONTROLS ==========
    
    /// @notice Pause the contract
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ========== HELPER FUNCTIONS ==========
    
    /// @notice Verify ECDSA signature
    /// @param _ethSignedMessageHash Hash of the signed message
    /// @param _signature Signature bytes
    /// @param _signer Expected signer address
    /// @return bool Whether signature is valid
    function _verifySignature(
        bytes32 _ethSignedMessageHash,
        bytes calldata _signature,
        address _signer
    ) internal pure returns (bool) {
        require(_signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(_signature.offset)
            s := calldataload(add(_signature.offset, 32))
            v := byte(0, calldataload(add(_signature.offset, 64)))
        }
        
        // Adjust v if necessary
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        address recoveredSigner = ecrecover(_ethSignedMessageHash, v, r, s);
        return recoveredSigner != address(0) && recoveredSigner == _signer;
    }
    
    /// @notice Remove node from active nodes array efficiently (O(1))
    /// @param _nodeID Node address to remove
    function _removeFromActiveNodes(address _nodeID) internal {
        uint256 index = activeNodeIndex[_nodeID];
        uint256 lastIndex = activeNodeIds.length - 1;
        
        if (index != lastIndex) {
            address lastNode = activeNodeIds[lastIndex];
            activeNodeIds[index] = lastNode;
            activeNodeIndex[lastNode] = index;
        }
        
        activeNodeIds.pop();
        delete activeNodeIndex[_nodeID];
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}