import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSocket } from '../services/socketService';

export const Home: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();

  // Validation function
  const isValidName = (name: string): boolean => {
    // Check if name has at least 4 characters
    if (name.trim().length < 4) return false;
    // Check if name contains only letters and spaces (no numbers)
    if (/\d/.test(name)) return false;
    return true;
  };

  // Handle input change - only allow letters and spaces
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any numbers from input
    const filteredValue = value.replace(/\d/g, '');
    setUserName(filteredValue);
  };

  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidName(userName)) {
      return;
    }

    setIsLoading(true);

    try {
      const socket = getSocket();
      
      // Set a timeout in case server doesn't respond
      const timeout = setTimeout(() => {
        setIsLoading(false);
        alert('Connection timeout. Please try again.');
      }, 10000);

      // Emit userJoin to register with backend
      socket.emit('userJoin', { userName: userName.trim() });

      // Wait for userInfo response (only once)
      socket.once('userInfo', (data: any) => {
        clearTimeout(timeout);
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
    <div className="min-h-screen w-full text-white overflow-hidden relative" style={{ backgroundColor: '#1a1a2e' }}>
      

      {/* Header with logo */}
      <div className="relative z-10 pt-12 px-6 text-center">
        <div className="flex items-center justify-center gap-4">
          
          <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 bg-clip-text text-transparent">BlockBattles</span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-12 lg:px-24 py-8">
        <div className="w-full max-w-5xl">
          {/* Heading */}
          <h1 className="text-4xl lg:text-8xl font-black text-white text-center mb-10 leading-tight">
            Real-time Grid
            <span className="block bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 bg-clip-text text-transparent mt-2">
              Multiplayer Game
            </span>
          </h1>

          {/* Description - 4 lines */}
          <div className="text-center mb-16 max-w-8xl mx-auto">
            <p className="text-xl lg:text-2xl text-gray-200 leading-relaxed mb-5 font-medium">
              Compete in real-time against players worldwide. Race to claim blocks on a 10x10 grid and build your territory.
            </p>
            <p className="text-lg lg:text-xl text-gray-300 leading-relaxed font-normal">
              Join instantly with your name, claim blocks with precision, and climb the leaderboard. Real-time synchronization ensures fair competitive gameplay with instant updates.
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleStartGame} className="flex flex-col gap-6 mb-8">
            {/* Input with Icons */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-full max-w-md relative">
                {/* Left Icon - User Profile */}
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                
                <input
                  type="text"
                  value={userName}
                  onChange={handleInputChange}
                  placeholder="Enter your player name"
                  maxLength={20}
                  disabled={isLoading}
                  className="w-full pl-16 pr-16 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border-2 border-white/20 hover:border-white/40 focus:border-pink-400 text-white text-center placeholder-gray-400 text-lg focus:outline-none focus:ring-4 focus:ring-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-medium"
                />
                
                {/* Right Icon - Arrow Play (Clickable) */}
                <button
                  type="submit"
                  disabled={isLoading || !isValidName(userName)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-6 w-6 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Validation Messages */}
              <div className="text-center max-w-md">
                {userName.length > 0 && (
                  <>
                    {userName.trim().length < 4 && (
                      <p className="text-sm text-yellow-400 font-medium">
                        ⚠️ Name must be at least 4 characters ({userName.trim().length}/4)
                      </p>
                    )}
                    {isValidName(userName) && (
                      <p className="text-sm text-green-400 font-medium">
                        ✓ Valid name
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">
                💡 Enter name to start game
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
