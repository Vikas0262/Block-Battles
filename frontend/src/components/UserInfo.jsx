import React from 'react';

function UserInfo({ user }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Your Info</h3>
      <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-100 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div 
          className="w-14 h-14 rounded-xl shadow-lg flex-shrink-0 ring-4 ring-white" 
          style={{ backgroundColor: user.color }}
        ></div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="font-bold text-gray-900 text-base truncate">{user.userName}</p>
          <p className="text-xs text-gray-500 font-mono bg-white px-2 py-0.5 rounded w-fit">
            ID: {user.userId.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}

// Memoize: Simple presentational component, prevent re-renders
export default React.memo(UserInfo);
