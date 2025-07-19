import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Appointments.css';

const Appointments = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>APPOINTMENTS</h1>
        </div>
        
        <div className="appointments-content">
          <div className="placeholder-content">
            <h2>Appointments Page</h2>
            <p>This is a placeholder for the Appointments page. Content will be added here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments; 