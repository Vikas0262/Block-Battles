import React, { useMemo } from 'react';
import PlayerCard from './PlayerCard';

interface GridUser {
  id: string;
  name: string;
  color: string;
  blocksOwned: number;
  joinedAt: number;
}

interface GameSidebarProps {
  users: GridUser[];
  currentUserId: string | undefined;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({ users, currentUserId }) => {
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => b.blocksOwned - a.blocksOwned);
  }, [users]);

  const topPlayers = useMemo(() => {
    return sortedUsers.slice(0, 3);
  }, [sortedUsers]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Players/Leaderboard Card */}
      <div className="glass-card rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-black text-white">
            👥 PLAYERS
          </h2>
          <div className="text-xs sm:text-sm text-gray-400">
            {sortedUsers.length} {sortedUsers.length === 1 ? 'Player' : 'Players'}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 overflow-y-auto pr-1 sm:pr-2" style={{ scrollbarGutter: 'stable', maxHeight: 'calc(100vh - 300px)' }}>
          {sortedUsers.map((u, idx) => (
            <PlayerCard
              key={u.id}
              player={u}
              isCurrentUser={u.id === currentUserId}
              rank={idx}
              showRank={false}
            />
          ))}

          {sortedUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No players yet</p>
              <p className="text-sm mt-2">Waiting for players to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Players Card */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-300 mb-4">🏆 Top 3</h3>
        <div className="flex flex-col gap-3">
          {topPlayers.length > 0 ? (
            topPlayers.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shadow-lg flex-shrink-0"
                  style={{
                    backgroundColor: player.color,
                    boxShadow: `0 4px 12px ${player.color}60`
                  }}
                >
                  {player.name.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-400 text-orange-900'}`}>
                      #{idx + 1}
                    </span>
                    <p className="font-bold text-white text-sm truncate">{player.name}</p>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{player.blocksOwned} tiles</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No players yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
