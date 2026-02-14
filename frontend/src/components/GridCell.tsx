import React, { memo, useCallback } from 'react';

interface GridBlock {
  blockId: number;
  owner: string | null;
  color: string;
  userName: string | null;
  claimedAt: number | null;
}

interface GridCellProps {
  block: GridBlock;
  isSelected: boolean;
  isClaiming: boolean;
  onClaim: (blockId: number) => void;
}

const GridCell = memo<GridCellProps>(({ block, isSelected, isClaiming, onClaim }) => {
  const handleClick = useCallback(() => {
    if (!block.owner && !isClaiming) {
      onClaim(block.blockId);
    }
  }, [block.owner, block.blockId, isClaiming, onClaim]);

  // Truncate name: show first 5 chars + "......" if longer
  const displayName = block.userName && block.userName.length > 5 
    ? `${block.userName.substring(0, 5)}......`
    : block.userName;

  return (
    <button
      onClick={handleClick}
      className={`
        rounded-lg flex flex-col items-center justify-center font-bold text-white
        transition-all duration-200 relative overflow-hidden
        ${!block.owner ? 'grid-cell cursor-pointer' : 'grid-cell-claimed cursor-default'}
      `}
      style={{
        backgroundColor: block.owner ? block.color : undefined,
        '--cell-color': block.owner ? `${block.color}80` : undefined,
        borderColor: isSelected ? 'rgba(255, 255, 255, 0.6)' : undefined,
      } as React.CSSProperties}
      title={block.owner ? `${block.userName}'s tile` : 'Click to claim'}
      disabled={!!block.owner || isClaiming}
    >
      {block.owner && (
        <>
          <span className="relative z-10 drop-shadow-lg text-xs md:text-sm lg:text-base font-black">
            {block.userName?.substring(0, 1).toUpperCase()}
          </span>
          <span className="relative z-10 drop-shadow-lg text-xs hidden md:block font-semibold">
            {displayName}
          </span>
        </>
      )}
    </button>
  );
});

GridCell.displayName = 'GridCell';

export default GridCell;
