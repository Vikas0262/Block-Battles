import React from 'react';
import Button from './Button.tsx';

interface RulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesDialog: React.FC<RulesDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-pink-500/30 shadow-2xl max-w-md w-full p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-white mb-2">Game Rules</h2>
          <p className="text-sm text-gray-400">Learn how to conquer the grid</p>
        </div>

        {/* Rules List */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <div className="text-2xl flex-shrink-0">🎯</div>
            <div>
              <p className="font-bold text-white text-sm">Claim Cells</p>
              <p className="text-xs text-gray-300 mt-1">Click on empty cells to make them yours</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl flex-shrink-0">⚡</div>
            <div>
              <p className="font-bold text-white text-sm">First Click Wins</p>
              <p className="text-xs text-gray-300 mt-1">Only the first player to click a cell owns it</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl flex-shrink-0">🏆</div>
            <div>
              <p className="font-bold text-white text-sm">Earn Points</p>
              <p className="text-xs text-gray-300 mt-1">More cells = higher ranking on leaderboard</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl flex-shrink-0">👥</div>
            <div>
              <p className="font-bold text-white text-sm">Compete Live</p>
              <p className="text-xs text-gray-300 mt-1">Battle with players around the world in real-time</p>
            </div>
          </div>
        </div>

        {/* OK Button */}
        <Button onClick={onClose} variant="primary" fullWidth>
          OK, Let's Play
        </Button>
      </div>
    </div>
  );
};

export default RulesDialog;
