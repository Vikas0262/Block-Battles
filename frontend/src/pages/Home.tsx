import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSocket } from '../services/socketService';

export const Home: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const socket = getSocket();
      
      // Emit userJoin to register with backend
      socket.emit('userJoin', { userName: userName.trim() });

      // Wait for userInfo response
      socket.once('userInfo', (data) => {
        setUser({
          userId: data.userId,
          userName: data.userName,
          color: data.color,
        });
        
        navigate('/game');
      });
    } catch (error) {
      console.error('Error starting game:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white overflow-hidden relative" style={{ backgroundColor: '#0f0f1e' }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full mix-blend-screen filter blur-[120px] opacity-25" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20" style={{ animation: 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '2s' }}></div>
      </div>

      {/* Header with logo */}
      <div className="relative z-10 pt-12 px-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl border-2 border-white/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">GridWars</span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-3xl">
          {/* Heading */}
          <h1 className="text-6xl lg:text-8xl font-black text-white text-center mb-10 leading-tight">
            Real-time Grid
            <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mt-2">
              Multiplayer Game
            </span>
          </h1>

          {/* Description - 4 lines */}
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-xl lg:text-2xl text-gray-200 leading-relaxed mb-5 font-medium">
              Compete with players worldwide in real-time. Claim grid cells, build your empire, and dominate the leaderboard.
            </p>
            <p className="text-lg lg:text-xl text-gray-300 leading-relaxed font-normal">
              Fast-paced, strategic gameplay with instant synchronization. No login required, just enter your name and start playing.
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleStartGame} className="flex flex-col gap-8 mb-8">
            {/* Input */}
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
                disabled={isLoading}
                className="w-full max-w-md px-8 py-5 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/30 hover:border-white/50 focus:border-purple-400 text-white text-center placeholder-gray-300 text-xl focus:outline-none focus:ring-4 focus:ring-purple-500/30 transition-all disabled:opacity-50 shadow-2xl font-semibold"
              />
            </div>

            {/* Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || !userName.trim()}
                className="px-16 py-5 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 text-white font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] transform hover:scale-105 hover:-translate-y-1 active:scale-95 text-xl border-2 border-white/20"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Game...
                  </span>
                ) : (
                  'START GAME'
                )}
              </button>
            </div>

            {/* Footer Note */}
            <div className="text-center">
              <p className="text-gray-300 text-base font-medium">
                ℹ️ No login system • Just enter your name to start playing
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 fixed bottom-8 right-8 text-right">
        <p className="text-sm text-gray-400 font-medium">
          GridWars © 2026 • Competitive Grid Gaming
        </p>
      </div>
    </div>
  );
};
