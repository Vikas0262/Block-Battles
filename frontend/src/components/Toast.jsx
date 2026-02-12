import React from 'react';

function Toast({ message, type }) {
  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  );
}

// Memoize: Prevent unnecessary re-renders of notification
export default React.memo(Toast);
