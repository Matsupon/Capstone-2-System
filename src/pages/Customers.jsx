import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Customers.css';

const customersData = [
  {
    id: 1,
    name: 'Juan Dela Cruz',
    contact: '09091234567',
    totalOrders: 3,
    lastAppointment: 'January 1, 2025',
    lastOrderStatus: 'Ongoing',
    orders: [
      {
        id: 101,
        appointmentDate: 'January 1, 2025',
        service: 'Customize Jersey',
        sizes: { Small: 1, Medium: 1 },
        phone: '09091234567',
        status: 'Ongoing',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 102,
        appointmentDate: 'December 1, 2024',
        service: 'Customize Jersey',
        sizes: { Large: 1 },
        phone: '09091234567',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 103,
        appointmentDate: 'November 1, 2024',
        service: 'Customize Jersey',
        sizes: { Medium: 2, Large: 1 },
        phone: '09091234567',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
    ],
  },
  {
    id: 2,
    name: 'Jane Doe',
    contact: '09123457890',
    totalOrders: 2,
    lastAppointment: 'February 2, 2025',
    lastOrderStatus: 'Completed',
    orders: [
      {
        id: 201,
        appointmentDate: 'February 2, 2025',
        service: 'Customize Jersey',
        sizes: { Small: 1, Medium: 1 },
        phone: '09123457890',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 202,
        appointmentDate: 'January 2, 2025',
        service: 'Customize Jersey',
        sizes: { Large: 1 },
        phone: '09123457890',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 203,
        appointmentDate: 'December 2, 2024',
        service: 'Customize Jersey',
        sizes: { Medium: 2, Large: 1 },
        phone: '09123457890',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
    ],
  },
  {
    id: 3,
    name: 'Sam Wilson',
    contact: '09123433456',
    totalOrders: 4,
    lastAppointment: 'March 3, 2025',
    lastOrderStatus: 'Completed',
    orders: [
      {
        id: 301,
        appointmentDate: 'March 3, 2025',
        service: 'Customize Jersey',
        sizes: { Small: 1, Medium: 1, Large: 1 },
        phone: '09123433456',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 302,
        appointmentDate: 'February 3, 2025',
        service: 'Customize Jersey',
        sizes: { Medium: 2, Large: 1 },
        phone: '09123433456',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
      {
        id: 303,
        appointmentDate: 'January 3, 2025',
        service: 'Customize Jersey',
        sizes: { Small: 1, Medium: 1 },
        phone: '09123433456',
        status: 'Completed',
        designImg: 'jersey.jpg',
        gcashImg: 'gcash.png',
        notes: 'Client requested sleeveless design with name print.'
      },
    ],
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Ongoing':
      return '#cddc39';
    case 'Completed':
      return '#4caf50';
    default:
      return '#333';
  }
};

const Customers = () => {
  const [profileModal, setProfileModal] = useState({ open: false, customer: null });
  const [expandedOrder, setExpandedOrder] = useState(null);

  const handleViewProfile = (customer) => {
    setProfileModal({ open: true, customer });
    setExpandedOrder(null);
  };

  const handleCloseModal = () => {
    setProfileModal({ open: false, customer: null });
    setExpandedOrder(null);
  };

  const handleExpandOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

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
              <h2 className="customers-modal-title">Customer Profile</h2>
              <div className="customers-modal-customer-info">
                <div><b>Name:</b> {profileModal.customer.name}</div>
                <div><b>Contact:</b> {profileModal.customer.contact}</div>
                <div><b>Total Orders:</b> {profileModal.customer.totalOrders}</div>
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
                          <div className="customers-modal-detail-value" style={{ color: getStatusColor(order.status) }}>{order.status}</div>

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
              <button className="customers-modal-close-btn" onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers; 