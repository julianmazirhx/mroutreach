import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Campaigns } from './components/Campaigns';
import { LeadsTracker } from './components/LeadsTracker';
import { BookedLeads } from './components/BookedLeads';
import { EditCampaign } from './components/EditCampaign';
import { SequenceEditorChat } from './components/SequenceEditorChat';
import { AdminPanel } from './components/AdminPanel';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/:id/chat" element={<SequenceEditorChat />} />
              <Route path="leads" element={<LeadsTracker />} />
              <Route path="booked" element={<BookedLeads />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;