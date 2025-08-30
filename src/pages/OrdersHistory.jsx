import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Orders.css';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const OrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch finished orders from the backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/history');
      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        setError('Failed to fetch order history');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching order history');
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status) => {
    return '#4caf50'; // Always green for completed orders in history
  };

  const handleViewFile = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleImageClick = (imageSrc, imageAlt) => {
    setSelectedImage({ src: imageSrc, alt: imageAlt });
    setShowImageModal(true);
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Check if the dateString contains time information (has space and colon)
    if (dateString.includes(' ') && dateString.includes(':')) {
      try {
        // It's a datetime string, parse it manually to avoid timezone issues
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Validate the parsed values
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          throw new Error('Invalid datetime format');
        }
        
        const monthName = monthNames[month - 1]; // month is 1-indexed in the string
        const time = `${hours % 12 === 0 ? 12 : hours % 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        
        return `${monthName} ${day} - ${time}`;
      } catch (error) {
        console.warn('Error parsing datetime string:', dateString, error);
        // Fallback to original logic if parsing fails
        const date = new Date(dateString);
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const time = date.toTimeString().split(' ')[0];
        return `${month} ${day} - ${time}`;
      }
    } else {
      // It's just a date string, use the original logic
      const date = new Date(dateString);
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      
      return `${month} ${day}`;
    }
  };

  const formatDateAndTime = (dateString, timeString) => {
    if (!dateString) return '';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const date = new Date(dateString);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = formatTimeToAMPM(timeString);
    return `${month} ${day} - ${time}`;
  };

  const formatTimeToAMPM = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title">
            <h1>ORDER'S HISTORY</h1>
          </div>
          <div className="orders-content">
            <p>Loading order history...</p>
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
            <h1>ORDER'S HISTORY</h1>
          </div>
          <div className="orders-content">
            <p>Error: {error}</p>
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
          <h1>ORDER'S HISTORY</h1>
        </div>
        <div className="orders-content">
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e8f4fd' }}>
                  <th>Order #</th>
                  <th>Name</th>
                  <th>Services</th>
                  <th>Status</th>
                  <th>Layout/Notes</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.appointment?.user?.name || 'N/A'}</td>
                    <td>{order.appointment?.service_type || 'N/A'}</td>
                    <td>
                      <div>
                        <span style={{ color: getStatusColor(order.status), display: 'block' }}>
                          {order.status}
                        </span>
                        {order.total_amount && (
                          <span style={{ fontSize: '12px', color: '#000' }}>
                            (₱{order.total_amount} total fee)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="action-link"
                        onClick={() => handleViewFile(order)}
                        style={{ color: '#007bff', cursor: 'pointer' }}
                      >
                        View File
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* View File Modal */}
          {showDetails && selectedOrder && (
            <div className="modal-bg">
              <div className="modal-panel details-modal" style={{ maxHeight: '90vh', width: 'min(700px, 95vw)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                <AiOutlineClose
                  className="orders-modal-exit-icon"
                  onClick={() => setShowDetails(false)}
                />
                <h2 style={{ textAlign: 'center', marginTop: '10px', marginBottom: '-5px' }}>Order Details</h2>
                <div className="details-container" style={{flexWrap: 'wrap'}}>
                  <div className="details-left">
                    <div className="detail-group">
                      <div className="detail-label">Full Name</div>
                      <div className="detail-value">{selectedOrder.appointment?.user?.name || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Service Type</div>
                      <div className="detail-value">{selectedOrder.appointment?.service_type || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Phone Number</div>
                      <div className="detail-value">{selectedOrder.appointment?.user?.phone || selectedOrder.appointment?.user?.phone_number || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Size</div>
                      <div className="detail-value">
                        {selectedOrder.appointment?.sizes ? (
                          <>
                            {Object.entries(JSON.parse(selectedOrder.appointment.sizes)).map(([size, qty]) => (
                              <div key={size}>{size} - {qty} pcs.</div>
                            ))}
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Quantity</div>
                      <div className="detail-value">
                        {selectedOrder.appointment?.total_quantity || 0} pcs.
                      </div>
                    </div>
                    {selectedOrder.total_amount && (
                      <div className="detail-group">
                        <div className="detail-label">Total Payment Fee</div>
                        <div className="detail-value">₱{selectedOrder.total_amount}</div>
                      </div>
                    )}
                  </div>
                  <div className="details-right">
                    <div className="detail-group">
                      <div className="detail-label">Due Date</div>
                      <div className="detail-value">{selectedOrder.appointment?.preferred_due_date ? new Date(selectedOrder.appointment.preferred_due_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    {selectedOrder.completed_at && (
                      <div className="detail-group">
                        <div className="detail-label">Completion Date</div>
                        <div className="detail-value">{formatDateForDisplay(selectedOrder.completed_at)}</div>
                      </div>
                    )}
                    <div className="detail-group">
                      <div className="detail-label">Current Status</div>
                      <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status) }}>
                        {selectedOrder.status}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Notes</div>
                      <div className="detail-value">{selectedOrder.appointment?.notes || 'No notes provided.'}</div>
                    </div>
                    <div className="image-label">Design Image</div>
                    {selectedOrder.appointment?.design_image ? (
                      <img 
                        src={`${process.env.NODE_ENV === 'development' ? 'http://192.168.137.170:8000' : ''}/storage/${selectedOrder.appointment.design_image}`} 
                        alt="Design" 
                        className="modal-image"
                        onClick={() => handleImageClick(
                          `${process.env.NODE_ENV === 'development' ? 'http://192.168.137.170:8000' : ''}/storage/${selectedOrder.appointment.design_image}`,
                          'Design Image'
                        )}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : (
                      <p>No design image available</p>
                    )}
                    {selectedOrder.appointment?.design_image && (
                      <p style={{ display: 'none', color: '#e74c3c', fontSize: '12px' }}>
                        Failed to load design image. The file may have been moved or deleted.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Modal for Zoom */}
          {showImageModal && selectedImage && (
            <div className="modal-bg" onClick={() => setShowImageModal(false)}>
              <div className="modal-panel" style={{ 
                maxWidth: '90vw', 
                maxHeight: '90vh', 
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }} onClick={e => e.stopPropagation()}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%', 
                  marginBottom: 15 
                }}>
                  <h3 style={{ margin: 0 }}>{selectedImage.alt}</h3>
                  <AiOutlineClose 
                    style={{ cursor: 'pointer', fontSize: '24px' }}
                    onClick={() => setShowImageModal(false)}
                  />
                </div>
                <img 
                  src={selectedImage.src} 
                  alt={selectedImage.alt} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh', 
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersHistory;
