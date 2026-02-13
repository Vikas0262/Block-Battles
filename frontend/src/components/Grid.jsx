import React from 'react';

// Memoized Grid component - prevents re-render when props haven't changed
function Grid({ grid, userInfo, onBlockClick }) {
  return (
    <div className="w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
        10×10 Grid - Click to Claim
      </h2>
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3 bg-gradient-to-br from-gray-100 to-gray-200 p-3 md:p-5 rounded-2xl shadow-inner">
        {grid.map((block) => (
          <div
            key={block.blockId}
            className={`
              aspect-square rounded-lg md:rounded-xl flex items-center justify-center
              transition-all duration-200 relative overflow-hidden
              border-2 text-xs md:text-sm font-bold text-white
              ${!block.owner 
                ? 'bg-gray-300 hover:bg-gray-400 cursor-pointer hover:scale-105 hover:shadow-lg border-gray-400 hover:border-gray-500' 
                : 'cursor-not-allowed shadow-md border-black/20'
              }
              ${block.owner === userInfo?.userId 
                ? 'ring-4 ring-yellow-400 ring-offset-2 shadow-xl' 
                : ''
              }
            `}
            style={{
              backgroundColor: block.color || undefined,
              boxShadow: block.owner ? `0 4px 15px ${block.color}40` : undefined
            }}
            onClick={() => !block.owner && onBlockClick(block.blockId)}
            title={block.owner ? `Owned by ${block.userName}` : 'Click to claim'}
          >
            {block.owner && (
              <div className="text-[9px] md:text-[11px] text-center break-words px-1 drop-shadow-lg font-semibold">
                {block.userName}
              </div>
            )}
            {!block.owner && (
              <div className="text-gray-500 text-xl opacity-50">+</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Memoize: Only re-render if props actually change
export default React.memo(Grid);
