import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { connectSocket } from './utils/socket';
import Home from './pages/Home';
import Game from './pages/Game';

function App() {
  // Initialize socket connection once on app mount
  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;
