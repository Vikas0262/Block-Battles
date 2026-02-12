// Grid Manager - Handles grid state and block ownership
// 10x10 grid = 100 blocks total

const GRID_SIZE = 10; // 10x10 grid
const TOTAL_BLOCKS = GRID_SIZE * GRID_SIZE; // 100 blocks

class GridManager {
  constructor() {
    // Initialize empty grid
    this.grid = this.createEmptyGrid();
    this.users = new Map(); // Store user info (id, name, color)
    this.userBlocks = new Map(); // Inverse index: userId => [blockIds] for fast O(1) cleanup
  }

  // Create empty 10x10 grid
  createEmptyGrid() {
    const grid = [];
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      grid.push({
        blockId: i,
        owner: null,       // User who owns this block
        color: '#E0E0E0',  // Default gray for unclaimed
        userName: null,
        claimedAt: null
      });
    }
    return grid;
  }

  // Add user to the users map
  addUser(userId, userName, color) {
    this.users.set(userId, {
      id: userId,
      name: userName,
      color: color,
      blocksOwned: 0,
      joinedAt: Date.now()
    });
    this.userBlocks.set(userId, []); // Initialize empty blocks array for fast cleanup
  }

  // Remove user and free their blocks (optimized with inverse index - O(1) instead of O(n))
  removeUser(userId) {
    // Use inverse index to quickly find all blocks owned by this user
    const userBlockIds = this.userBlocks.get(userId) || [];
    
    // Only reset blocks this specific user owns (instead of checking all 100)
    userBlockIds.forEach(blockId => {
      const block = this.grid[blockId];
      block.owner = null;
      block.color = '#E0E0E0';
      block.userName = null;
      block.claimedAt = null;
    });
    
    // Remove user from all maps
    this.users.delete(userId);
    this.userBlocks.delete(userId);
  }

  // Claim a block for a user (with strict validation)
  claimBlock(blockId, userId) {
    // Validate input types and ranges
    if (!Number.isInteger(blockId) || blockId < 0 || blockId >= TOTAL_BLOCKS) {
      return { success: false, message: 'Invalid block ID' };
    }
    if (typeof userId !== 'string' || !userId) {
      return { success: false, message: 'Invalid user ID' };
    }

    const block = this.grid[blockId];
    
    // Check if block is already claimed
    if (block.owner !== null) {
      return { 
        success: false, 
        message: 'Block already claimed',
        block: block
      };
    }

    // Get user info
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Claim the block
    block.owner = userId;
    block.color = user.color;
    block.userName = user.name;
    block.claimedAt = Date.now();
    
    // Update user stats and inverse index
    user.blocksOwned += 1;
    this.userBlocks.get(userId).push(blockId); // Track block ownership

    return {
      success: true,
      message: 'Block claimed successfully',
      block: block,
      user: user
    };
  }

  // Get current grid state
  getGrid() {
    return this.grid;
  }

  // Get user info
  getUser(userId) {
    return this.users.get(userId);
  }

  // Get all users
  getAllUsers() {
    return Array.from(this.users.values());
  }

  // Get leaderboard (users sorted by blocks owned)
  getLeaderboard() {
    return Array.from(this.users.values())
      .sort((a, b) => b.blocksOwned - a.blocksOwned)
      .slice(0, 10); // Top 10
  }

  // Get grid size
  getGridSize() {
    return { rows: GRID_SIZE, cols: GRID_SIZE, total: TOTAL_BLOCKS };
  }

  // Reset entire grid
  resetGrid() {
    this.grid = this.createEmptyGrid();
    this.users.clear();
  }
}

// Initialize and export grid manager
export function initializeGrid() {
  return new GridManager();
}
