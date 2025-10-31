import React, { useState, useEffect } from 'react';
import '../styles/Orders.css';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const OrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/history');
      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        throw new Error('Failed to fetch order history');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error fetching order history');
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Color for order status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return '#2196f3';
      case 'pending':
        return '#ff9800';
      case 'ongoing':
        return '#2196f3';
      case 'cancelled':
      case 'canceled':
        return '#f44336';
      default:
        return '#333';
    }
  };

  // Format date with AM/PM time
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const options = {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      return date.toLocaleString('en-US', options);
    } catch {
      return dateString;
    }
  };

  // Open modal for order details
  const handleViewFile = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  // Image zoom modal
  const handleImageClick = (imageSrc, imageAlt) => {
    setSelectedImage({ src: imageSrc, alt: imageAlt });
    setShowImageModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-title">
          <h1>ORDER HISTORY</h1>
        </div>
        <div className="orders-content">
          <p>Loading order history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-wrap">
        <div className="page-title">
          <h1>ORDER HISTORY</h1>
        </div>
        <div className="orders-content">
          <p style={{ color: 'red' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-title">
        <h1>ORDER HISTORY</h1>
      </div>

      <div className="orders-content">
        <div
          style={{
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: 24,
            margin: '0 16px',
          }}
        >
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
              {orders.length > 0 ? (
                orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.appointment?.user?.name || 'N/A'}</td>
                    <td>{order.appointment?.service_type || 'N/A'}</td>
                    <td>
                      <div>
                        <span
                          style={{
                            color: getStatusColor(order.status),
                            display: 'block',
                            fontWeight: 500,
                          }}
                        >
                          {order.status === 'Completed' ? 'Finished' : (order.status || 'Unknown')}
                        </span>
                        {order.total_amount && (
                          <span style={{ fontSize: '12px', color: '#000' }}>
                            (₱{order.total_amount.toLocaleString()} total fee)
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
                        View Details
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>
                    No order history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Details Modal (Dashboard design) */}
        {showDetails && selectedOrder && (
          <div
            className={`dashboard-modal-bg animate-fade${detailsClosing ? ' closing' : ''}`}
            onClick={() => {
              setDetailsClosing(true);
              setTimeout(() => {
                setShowDetails(false);
                setDetailsClosing(false);
              }, 200);
            }}
          >
            <div
              className={`dashboard-modal-panel animate-pop${detailsClosing ? ' closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <AiOutlineClose
                className="dashboard-modal-exit-icon"
                onClick={() => {
                  setDetailsClosing(true);
                  setTimeout(() => {
                    setShowDetails(false);
                    setDetailsClosing(false);
                  }, 200);
                }}
              />
              <h2 className="dashboard-modal-title">Order Details</h2>
              <div className="details-container" style={{ flexWrap: 'wrap', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', paddingRight: 8 }}>
                <div className="details-left">
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Full Name</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.user?.name || 'N/A'}</div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Queue Number</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.queue_number}</div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Appointment Date Accepted</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.appointment_date ? new Date(selectedOrder.appointment.appointment_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Service Type</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.service_type || 'N/A'}</div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Phone Number</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.user?.phone || selectedOrder.appointment?.user?.phone_number || 'N/A'}</div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Size</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>
                      {selectedOrder.appointment?.sizes ? (
                        <>
                          {Object.entries(JSON.parse(selectedOrder.appointment.sizes)).map(([size, qty]) => (
                            <div key={size}>{size} - {qty} pcs.</div>
                          ))}
                        </>
                      ) : 'N/A'}
                    </div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Quantity</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>
                      {selectedOrder.appointment?.total_quantity || 0} pcs.
                    </div>
                  </div>
                  {(selectedOrder.status === 'Finished' || selectedOrder.status === 'Completed') && selectedOrder.total_amount && (
                    <div className="detail-group" style={{ marginBottom: 8 }}>
                      <div className="detail-label" style={{ fontWeight: 600 }}>Total Payment Fee</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>₱{selectedOrder.total_amount}</div>
                    </div>
                  )}
                </div>
                <div className="details-right">
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Due Date</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.preferred_due_date ? new Date(selectedOrder.appointment.preferred_due_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  {(selectedOrder.status === 'Finished' || selectedOrder.status === 'Completed') && selectedOrder.completed_at && (
                    <div className="detail-group" style={{ marginBottom: 8 }}>
                      <div className="detail-label" style={{ fontWeight: 600 }}>Completion Date</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{formatDateForDisplay(selectedOrder.completed_at)}</div>
                    </div>
                  )}
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Current Status</div>
                    <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status), fontWeight: 400 }}>
                      {selectedOrder.status === 'Completed' ? 'Finished' : selectedOrder.status}
                    </div>
                  </div>
                  <div className="detail-group" style={{ marginBottom: 8 }}>
                    <div className="detail-label" style={{ fontWeight: 600 }}>Notes</div>
                    <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.notes || 'No notes provided.'}</div>
                  </div>
                  <div className="image-label" style={{ fontWeight: 600 }}>Design Image</div>
                  {selectedOrder.appointment?.design_image ? (
                    <img 
                      src={selectedOrder.appointment.design_image} 
                      alt="Design" 
                      className="dashboard-modal-image"
                      onClick={() => handleImageClick(
                        selectedOrder.appointment.design_image,
                        'Design Image'
                      )}
                      onError={(e) => {
                        console.error('Failed to load image:', e.target.src);
                        e.target.style.display = 'none';
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

        {/* Image Zoom Modal (Dashboard design) */}
        {showImageModal && selectedImage && (
          <div className="dashboard-modal-bg animate-fade" onClick={() => setShowImageModal(false)}>
            <div className="dashboard-modal-panel animate-pop" onClick={(e) => e.stopPropagation()} style={{ padding: 12 }}>
              <AiOutlineClose className="dashboard-modal-exit-icon" onClick={() => setShowImageModal(false)} />
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 6, border: '1px solid #ddd' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersHistory;
