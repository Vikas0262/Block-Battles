import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  userId: string;
  userName: string;
  color: string;
}

export interface UserContextType {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    // Only read from localStorage on initialization
    try {
      const stored = localStorage.getItem('blockBattlesUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Debounced localStorage update - only persist when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('blockBattlesUser', JSON.stringify(user));
    }
  }, [user]);

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    localStorage.removeItem('blockBattlesUser');
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
