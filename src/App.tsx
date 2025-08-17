import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Arena from './components/Arena';
import AgentCenter from './components/AgentCenter';
import Leaderboard from './components/Leaderboard';
import SystemControl from './components/SystemControl';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <Navigation />
        <Routes>
          <Route path="/arena" element={<Arena />} />
          <Route path="/agents" element={<AgentCenter />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/system" element={<SystemControl />} />
          <Route path="/" element={<Navigate to="/system" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
