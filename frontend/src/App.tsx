import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useUser } from './context/UserContext';
import { Home } from './pages/Home';
import { Game } from './pages/Game';

// Protected route component - only allow access to /game if user is logged in
function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return element;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<ProtectedRoute element={<Game />} />} />
        {/* Catch-all: redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </Router>
  );
}

export default App;
