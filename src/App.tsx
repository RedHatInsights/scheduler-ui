import React from 'react';
import { Routes, Route } from 'react-router-dom';
import '@patternfly/patternfly/patternfly.css';
import './Components/ScheduleReportWizard/ScheduleReportWizard.css';
import './Components/GlobalScheduler/GlobalScheduler.css';
import SchedulerPage from './Components/SchedulerPage/SchedulerPage';
import './App.scss';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SchedulerPage />} />
    </Routes>
  );
};

export default App;
