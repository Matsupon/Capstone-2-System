import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Orders.css';

const Orders = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>ORDERS</h1>
        </div>
        
        <div className="orders-content">
          <div className="placeholder-content">
            <h2>Orders Page</h2>
            <p>This is a placeholder for the Orders page. Content will be added here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders; 