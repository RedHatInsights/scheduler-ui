import React from 'react';
import { Routes, Route } from 'react-router-dom';
import '@patternfly/patternfly/patternfly.css';
import DownloadPage from './Components/DownloadPage/DownloadPage';
import SchedulerLanding from './Components/SchedulerLanding/SchedulerLanding';
import './App.scss';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/download/:jobId/:runId" element={<DownloadPage />} />
      <Route path="*" element={<SchedulerLanding />} />
    </Routes>
  );
};

export default App;
