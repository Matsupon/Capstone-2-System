import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Customers.css';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const getStatusColor = (status) => {
  switch (status) {
    case 'Ongoing':
      return '#cddc39';
    case 'Completed':
    case 'Finished':   // ✅ treat Finished same as Completed
      return '#4caf50';
    case 'Pending':
      return '#ff9800';
    case 'Ready to Check':
      return '#2196f3';
    case 'No Orders':
      return '#9e9e9e';
    default:
      return '#333';
  }
};


const Customers = () => {
  const [customersData, setCustomersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileModal, setProfileModal] = useState({ open: false, customer: null });
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/customers');
        
        if (response.data.success) {
          setCustomersData(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch customers');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch customers');
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleViewProfile = async (customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}`);
      
      if (response.data.success) {
        setProfileModal({ open: true, customer: response.data.data });
        setExpandedOrder(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch customer profile');
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err);
      alert('Failed to load customer profile');
    }
  };

  const handleCloseModal = () => {
    setProfileModal({ open: false, customer: null });
    setExpandedOrder(null);
  };

  const handleExpandOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title">
            <h1>CUSTOMERS</h1>
          </div>
          <div className="customers-table-content">
            <div className="customers-table-wrapper">
              <div style={{ textAlign: 'center', padding: '50px' }}>
                Loading customers...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title">
            <h1>CUSTOMERS</h1>
          </div>
          <div className="customers-table-content">
            <div className="customers-table-wrapper">
              <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                Error: {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-title">
          <h1>CUSTOMERS</h1>
        </div>
        <div className="customers-table-content">
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr className="customers-table-header-row">
                  <th className="customers-th">#</th>
                  <th className="customers-th">Name</th>
                  <th className="customers-th">Contact Number</th>
                  <th className="customers-th">Total Orders</th>
                  <th className="customers-th">Last Appoint.</th>
                  <th className="customers-th">Last Order Status</th>
                  <th className="customers-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customersData.map((customer, idx) => (
                  <tr key={customer.id} className="customers-table-row">
                    <td className="customers-td">{idx + 1}</td>
                    <td className="customers-td">{customer.name}</td>
                    <td className="customers-td">{customer.contact}</td>
                    <td className="customers-td">{customer.totalOrders}</td>
                    <td className="customers-td">{customer.lastAppointment}</td>
                    <td className="customers-td">
                      <span style={{ color: getStatusColor(customer.lastOrderStatus), fontWeight: 500 }}>
                        {customer.lastOrderStatus}
                      </span>
                    </td>
                    <td className="customers-td">
                      <button
                        className="customers-view-profile-btn"
                        onClick={() => handleViewProfile(customer)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile Modal */}
        {profileModal.open && profileModal.customer && (
          <div className="customers-modal-bg">
            <div className="customers-modal-panel">
              <AiOutlineClose
                className="customers-modal-exit-icon"
                onClick={handleCloseModal}
              />
              <h2 className="customers-modal-title">Customer Profile</h2>
              <div className="customers-modal-customer-info">
                <div><b>Name:</b> {profileModal.customer.name}</div>
                <div><b>Contact:</b> {profileModal.customer.contact}</div>
                <div><b>Total Orders:</b> {profileModal.customer.totalOrders}</div>
                <div><b>Address:</b> {profileModal.customer.address}</div>
              </div>
              <div className="customers-modal-orders-list">
                <h3 className="customers-modal-orders-title">Previous Orders</h3>
                {profileModal.customer.orders.map((order) => (
                  <div key={order.id} className="customers-modal-order-item">
                    <div
                      className="customers-modal-order-summary"
                      onClick={() => handleExpandOrder(order.id)}
                    >
                      <span>Order #{order.id}</span>
                      <span className="customers-modal-order-status" style={{ color: getStatusColor(order.status) }}>{order.status}</span>
                      <span className={`customers-modal-order-arrow ${expandedOrder === order.id ? 'expanded' : ''}`}>▼</span>
                    </div>
                    {expandedOrder === order.id && (
                      <div className="customers-modal-order-details">
                        <div className="customers-modal-details-left">
                          <div className="customers-modal-detail-label">Appointment Date Accepted</div>
                          <div className="customers-modal-detail-value">{order.appointmentDate}</div>
                          <div className="customers-modal-detail-label">Service Type</div>
                          <div className="customers-modal-detail-value">{order.service}</div>
                          <div className="customers-modal-detail-label">Size</div>
                          <div className="customers-modal-detail-value">
                            {order.sizes && Object.keys(order.sizes).length > 0 ? (
                              <>
                                {Object.entries(order.sizes).map(([size, qty]) => (
                                  <div key={size}>{size} - {qty} pcs.</div>
                                ))}
                              </>
                            ) : 'N/A'}
                          </div>
                          <div className="customers-modal-detail-label">Quantity</div>
                          <div className="customers-modal-detail-value">
                            {order.sizes ? Object.values(order.sizes).reduce((a, b) => a + b, 0) : 0} pcs.
                          </div>
                          <div className="customers-modal-detail-label">Phone Number</div>
                          <div className="customers-modal-detail-value">{order.phone}</div>
                          <div className="customers-modal-detail-label">Current Status</div>
                          <div className="customers-modal-detail-value" style={{ color: getStatusColor(order.status) }}>
                            {order.status}
                          </div>

                          {order.status === 'Completed' && (
                            <>
                              <div className="customers-modal-detail-label">Total Payment Fee</div>
                              <div className="customers-modal-detail-value">₱{order.paymentFee?.toLocaleString() || '0.00'}</div>
                            </>
                          )}
                        </div>
                        <div className="customers-modal-details-right">
                          <div className="customers-modal-detail-label">Notes</div>
                          <div className="customers-modal-detail-value">
                            {order.notes || 'N/A'}
                          </div>
                          <div className="customers-modal-image-label">Design Image</div>
                          <img src={order.designImg} alt="Design" className="customers-modal-image" />
                          <div className="customers-modal-image-label">GCash Proof</div>
                          <img src={order.gcashImg} alt="GCash Proof" className="customers-modal-image" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
