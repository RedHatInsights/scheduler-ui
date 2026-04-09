import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SchedulerPage from './Components/SchedulerPage';
import './App.scss';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SchedulerPage />} />
    </Routes>
  );
};

export default App;
