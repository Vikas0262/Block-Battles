import { memo } from 'react';

interface GridUser {
  id: string;
  name: string;
  color: string;
  blocksOwned: number;
  joinedAt: number;
}

interface PlayerCardProps {
  player: GridUser;
  isCurrentUser: boolean;
  rank: number;
  showRank: boolean;
}

const PlayerCard = memo<PlayerCardProps>(({ player, isCurrentUser, rank, showRank }) => (
  <div
    className="p-3 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600 flex items-start gap-3"
    style={{
      background: 'rgba(255, 255, 255, 0.05)'
    }}
  >
    {showRank && (
      <div className="text-sm font-bold text-gray-400 w-6 flex-shrink-0 pt-0.5">
        #{rank + 1}
      </div>
    )}

    <div className="flex items-center gap-3 flex-1">
      {/* Color Box */}
      <div
        className="w-10 h-10 rounded-md flex-shrink-0"
        style={{ 
          backgroundColor: player.color
        }}
      />
      
      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {player.name}
          {isCurrentUser && <span className="text-xs text-gray-400 ml-2">(You)</span>}
        </p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-white">{player.blocksOwned}</p>
      </div>
    </div>
  </div>
));

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
