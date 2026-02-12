import React from 'react';

// Memoized Grid component - prevents re-render when props haven't changed
function Grid({ grid, userInfo, onBlockClick }) {
  return (
    <div className="grid-container">
      <h2>10×10 Grid (Click to Claim)</h2>
      <div className="grid">
        {grid.map((block) => (
          <div
            key={block.blockId}
            className={`grid-cell ${block.owner ? 'claimed' : 'unclaimed'} ${
              block.owner === userInfo?.userId ? 'my-block' : ''
            }`}
            style={{
              backgroundColor: block.color,
              cursor: block.owner ? 'not-allowed' : 'pointer'
            }}
            onClick={() => !block.owner && onBlockClick(block.blockId)}
            title={block.owner ? `Owned by ${block.userName}` : 'Click to claim'}
          >
            {block.owner && (
              <div className="block-owner">{block.userName}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Memoize: Only re-render if props actually change
export default React.memo(Grid);
