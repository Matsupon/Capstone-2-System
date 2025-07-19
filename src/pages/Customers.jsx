import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Customers.css';

const Customers = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>CUSTOMERS</h1>
        </div>
        
        <div className="customers-content">
          <div className="placeholder-content">
            <h2>Customers Page</h2>
            <p>This is a placeholder for the Customers page. Content will be added here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customers; 