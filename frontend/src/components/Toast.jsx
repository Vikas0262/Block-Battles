import React from 'react';

function Toast({ message, type }) {
  const typeStyles = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-500/50',
    error: 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/50',
    info: 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-blue-500/50'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div className={`
      fixed bottom-6 right-6 px-6 py-4 rounded-xl text-white font-semibold
      shadow-2xl animate-slide-in z-50 max-w-sm
      flex items-center gap-3
      backdrop-blur-sm
      ${typeStyles[type] || typeStyles.info}
    `}>
      <span className="text-2xl">{icons[type]}</span>
      <span className="text-sm md:text-base">{message}</span>
    </div>
  );
}

// Memoize: Prevent unnecessary re-renders of notification
export default React.memo(Toast);
