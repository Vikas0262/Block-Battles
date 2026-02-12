/**
 * Grid Manager - Handles game grid state and block ownership
 * 10x10 grid with 100 blocks total
 * Uses inverse indexing for O(1) block cleanup on user disconnect
 */

const GRID_SIZE = 10;
const TOTAL_BLOCKS = 100;

class GridManager {
  constructor() {
    // Initialize empty grid
    this.grid = this.createEmptyGrid();
    this.users = new Map(); // Store user info (id, name, color)
    this.userBlocks = new Map(); // Inverse index: userId => [blockIds] for fast O(1) cleanup
  }

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

  removeUser(userId) {
    const userBlockIds = this.userBlocks.get(userId) || [];
    userBlockIds.forEach(blockId => {
      const block = this.grid[blockId];
      block.owner = null;
      block.color = '#E0E0E0';
      block.userName = null;
      block.claimedAt = null;
    });
    
    this.users.delete(userId);
    this.userBlocks.delete(userId);
  }

  claimBlock(blockId, userId) {
    if (!Number.isInteger(blockId) || blockId < 0 || blockId >= TOTAL_BLOCKS) {
      return { success: false, message: 'Invalid block ID' };
    }
    if (typeof userId !== 'string' || !userId) {
      return { success: false, message: 'Invalid user ID' };
    }

    const block = this.grid[blockId];
    if (block.owner !== null) {
      return { success: false, message: 'Block already claimed', block };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    block.owner = userId;
    block.color = user.color;
    block.userName = user.name;
    block.claimedAt = Date.now();
    user.blocksOwned += 1;
    this.userBlocks.get(userId).push(blockId);

    return {
      success: true,
      message: 'Block claimed successfully',
      block: block,
      user: user
    };
  }

  getGrid() {
    return this.grid;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  getLeaderboard() {
    return Array.from(this.users.values())
      .sort((a, b) => b.blocksOwned - a.blocksOwned)
      .slice(0, 10);
  }

  getGridSize() {
    return { rows: GRID_SIZE, cols: GRID_SIZE, total: TOTAL_BLOCKS };
  }

  resetGrid() {
    this.grid = this.createEmptyGrid();
    this.users.clear();
  }
}

// Initialize and export grid manager
export function initializeGrid() {
  return new GridManager();
}
