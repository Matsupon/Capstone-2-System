import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Orders.css';

const initialOrders = [
  {
    id: 1,
    queueNumber: '001',
    name: 'Juan Dela Cruz',
    services: 'Customize Jersey',
    status: 'Ready to check',
    dueDate: 'May 30 - 9:30 AM',
    designImg: 'jersey.jpg',
    appointmentDate: 'May 28, 2023',
    phoneNumber: '+63 912 345 6789'
  },
  {
    id: 2,
    queueNumber: '002',
    name: 'Dianne Javellana',
    services: 'Customize Jersey',
    status: 'Pending',
    dueDate: 'June 1 - 11:00 AM',
    designImg: 'jersey.jpg',
    appointmentDate: 'May 29, 2023',
    phoneNumber: '+63 923 456 7890'
  },
  {
    id: 3,
    queueNumber: '003',
    name: 'Sam Wilson',
    services: 'Customize Jersey',
    status: 'Completed',
    dueDate: 'April 1 - 1:00 PM',
    designImg: 'jersey.jpg',
    appointmentDate: 'March 30, 2023',
    phoneNumber: '+63 934 567 8901'
  },
];

const Orders = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpdateDropdown, setShowUpdateDropdown] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready to check':
        return '#e91e63';
      case 'Pending':
        return '#ff9800';
      case 'Completed':
        return '#4caf50';
      default:
        return '#333';
    }
  };

  const handleViewFile = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setShowUpdateDropdown(null);
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const toggleUpdateDropdown = (orderId) => {
    setShowUpdateDropdown(showUpdateDropdown === orderId ? null : orderId);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>ORDERS</h1>
        </div>
        
        <div className="orders-content">
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e8f4fd' }}>
                  <th>Queue #</th>
                  <th>Name</th>
                  <th>Services</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Layout/Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.queueNumber}</td>
                    <td>{order.name}</td>
                    <td>{order.services}</td>
                    <td>
                      <span style={{ color: getStatusColor(order.status) }}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.dueDate}</td>
                    <td>
                      <span 
                        className="action-link" 
                        onClick={() => handleViewFile(order)}
                        style={{ color: '#007bff', cursor: 'pointer' }}
                      >
                        View File
                      </span>
                    </td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="update-btn"
                          onClick={() => toggleUpdateDropdown(order.id)}
                          style={{
                            backgroundColor: '#4fc3f7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 16px',
                            cursor: 'pointer'
                          }}
                        >
                          Update
                        </button>
                        {showUpdateDropdown === order.id && (
                          <div className="update-dropdown">
                            <div 
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Ready to check')}
                            >
                              Ready to check
                            </div>
                            <div 
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Pending')}
                            >
                              Pending
                            </div>
                            <div 
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Completed')}
                            >
                              Completed
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* View File Modal */}
          {showDetails && selectedOrder && (
            <div className="modal-bg">
              <div className="modal-panel details-modal" style={{ maxHeight: '90vh' }}>
                <h2 style={{ textAlign: 'center', marginTop: '10px', marginBottom: '25px' }}>Order Details</h2>
                <div className="details-container">
                  <div className="details-left">
                    <div className="detail-group">
                      <div className="detail-label">Full Name</div>
                      <div className="detail-value">{selectedOrder.name}</div>
                    </div>
                    
                    <div className="detail-group">
                      <div className="detail-label">Queue Number</div>
                      <div className="detail-value">{selectedOrder.queueNumber}</div>
                    </div>
                    
                    <div className="detail-group">
                      <div className="detail-label">Appointment Date Accepted</div>
                      <div className="detail-value">{selectedOrder.appointmentDate}</div>
                    </div>
                    
                    <div className="detail-group">
                      <div className="detail-label">Service Type</div>
                      <div className="detail-value">{selectedOrder.services}</div>
                    </div>
                    
                    <div className="detail-group">
                      <div className="detail-label">Phone Number</div>
                      <div className="detail-value">{selectedOrder.phoneNumber}</div>
                    </div>
                    
                    <div className="detail-group">
                      <div className="detail-label">Current Status</div>
                      <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status) }}>
                        {selectedOrder.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="details-right">
                    <div className="image-label">Design Image</div>
                    <img src={selectedOrder.designImg} alt="Design" className="modal-image" />
                  </div>
                </div>
                <button className="modal-button" onClick={() => setShowDetails(false)}>Close</button>
              </div>
            </div>
          )}

          {/* Update Success Popup */}
          {updateSuccess && (
            <div className="popup-success">
              <h3 style={{ color: '#4caf50' }}>Update changed successfully!</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;