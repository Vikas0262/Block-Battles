import React, { createContext, useState, useCallback, ReactNode } from 'react';

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
    const stored = localStorage.getItem('gridGameUser');
    return stored ? JSON.parse(stored) : null;
  });

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser);
    localStorage.setItem('gridGameUser', JSON.stringify(newUser));
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    localStorage.removeItem('gridGameUser');
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
