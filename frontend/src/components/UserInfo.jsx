import React from 'react';

function UserInfo({ user }) {
  return (
    <div className="user-info">
      <h3>Your Info</h3>
      <div className="user-card">
        <div className="user-color" style={{ backgroundColor: user.color }}></div>
        <div className="user-details">
          <p className="user-name">{user.userName}</p>
          <p className="user-id">ID: {user.userId.slice(0, 8)}...</p>
        </div>
      </div>
    </div>
  );
}

// Memoize: Simple presentational component, prevent re-renders
export default React.memo(UserInfo);
