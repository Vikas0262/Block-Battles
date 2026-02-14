import React from 'react';
import Button from './Button';

interface GameNavbarProps {
  userName: string;
  userColor: string;
  currentUserBlocks: number;
  isConnected: boolean;
  onExit: () => void;
}

export const GameNavbar: React.FC<GameNavbarProps> = ({
  userName,
  userColor,
  currentUserBlocks,
  isConnected,
  onExit,
}) => {
  return (
    <nav className="glass-nav px-3 sm:px-6 md:px-8 lg:px-16 py-3 md:py-4 sticky top-0 z-50">
      <div className="max-w-full lg:max-w-[1800px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">BlockBattles</span>
        </div>

        {/* Right: Player Badge & Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simple Player Badge - Compact */}
          <div className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg glass-card" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
            <div
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-md shadow-lg"
              style={{
                backgroundColor: userColor,
                boxShadow: `0 4px 12px ${userColor}60`
              }}
            />
            <div className="block">
              <p className="text-xs sm:text-xs text-gray-400">{userName}</p>
              <p className="text-xs sm:text-sm font-bold text-pink-400">{currentUserBlocks} tiles</p>
            </div>
          </div>

          {/* Online Status */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl glass-card">
            <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${isConnected ? 'bg-green-500 pulse-glow' : 'bg-red-500'}`} />
            <span className="text-xs sm:text-sm font-medium text-white">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Exit Button */}
          <Button
            onClick={onExit}
            variant="secondary"
            className="px-2 sm:px-5 py-2 text-xs sm:text-base"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
            }}
          >
            ✕ <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
