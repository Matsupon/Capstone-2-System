import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Orders.css';
import '../styles/Feedback.css';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const OrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false - only show loading if request is slow
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Create abort controller for request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;
    
    // Optimistic UI - only show loading if request takes longer than 150ms
    const showLoadingTimeout = setTimeout(() => {
      setLoading(true);
    }, 150);

    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders/history', { signal });
        
        if (signal.aborted) return;
        clearTimeout(showLoadingTimeout);
        
        if (response.data.success) {
          setOrders(response.data.data);
          setError(null);
        } else {
          throw new Error('Failed to fetch order history');
        }
        setLoading(false);
      } catch (err) {
        if (signal.aborted || err.name === 'CanceledError' || err.name === 'AbortError') return;
        clearTimeout(showLoadingTimeout);
        setError(err.response?.data?.error || err.message || 'Error fetching order history');
        console.error('Error fetching order history:', err);
        setLoading(false);
      }
    };

    fetchOrders();
    
    return () => {
      clearTimeout(showLoadingTimeout);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Color for order status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#1565c0';
      case 'finished':
        return '#1565c0';
      case 'pending':
        return '#1565c0'; // darker yellow text
      case 'ongoing':
        return '#1565c0';
      case 'ready to check':
        return '#b23c17'; // darker orange text
      case 'cancelled':
      case 'canceled':
        return '#c62828';
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

  // Pagination calculations - memoized for performance
  const { totalPages, currentOrders } = useMemo(() => {
    const total = Math.ceil(orders.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const current = orders.slice(start, end);
    return { totalPages: total, currentOrders: current };
  }, [orders, currentPage, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Scroll to top whenever page changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure scroll happens after DOM update
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [currentPage]);

  // Loading state
  if (loading) {
    return (
      <div className="page-wrap">
        <div className="orders-content" style={{ marginTop: 8 }}>
          <p>Loading order history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-wrap">
        <div className="orders-content" style={{ marginTop: 8 }}>
          <p style={{ color: 'red' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="orders-content" style={{ marginTop: 8 }}>
        <div
          className="feedback-card-container"
          style={{
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            marginBottom: 10,
            overflow: 'hidden',
            padding: '24px 24px 8px 24px',
            margin: '0 16px 10px 16px'
          }}
        >
          <div className={`table-scroll-container ${orders.length > 0 && totalPages > 1 ? 'with-pagination' : ''}`}>
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
                currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.appointment?.user?.name || 'N/A'}</td>
                    <td>{order.appointment?.service_type || 'N/A'}</td>
                    <td>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 9999,
                            background: (() => {
                              const s = (order.status || '').toLowerCase();
                              if (s === 'pending') return 'rgba(33, 150, 243, 0.15)';
                              if (s === 'ready to check') return 'rgba(33, 150, 243, 0.15)';
                              if (s === 'completed') return 'rgba(33, 150, 243, 0.15)';
                              if (s === 'finished') return 'rgba(33, 150, 243, 0.15)';
                              if (s === 'cancelled' || s === 'canceled') return 'rgba(33, 150, 243, 0.15)';
                              return 'rgba(0,0,0,0.06)';
                            })(),
                            color: getStatusColor(order.status),
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          {order.status === 'Completed' ? 'Finished' : (order.status || 'Unknown')}
                        </span>
                        {order.total_amount && (
                          <span style={{ display: 'block', fontSize: '12px', color: '#000', marginTop: 4 }}>
                            ₱{order.total_amount.toLocaleString()} total fee
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
        </div>
      </div>

      {/* Pagination Panel - Fixed at bottom */}
      {orders.length > 0 && totalPages > 1 && (
        <div className="pagination-panel">
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
            <span className="pagination-meta" style={{ marginLeft: 12, color: '#475569', fontSize: 13 }}>
              Showing {currentOrders.length} of {orders.length} results
            </span>
          </div>
        </div>
      )}

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
              <h2 className="dashboard-modal-title" style={{ marginTop: 0, paddingTop: 0 }}>Order Details</h2>
                <div className="details-container" style={{ flexWrap: 'wrap', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
                  <div className="details-left">
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Full Name</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.user?.name || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Appointment Date Accepted</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.appointment_date ? new Date(selectedOrder.appointment.appointment_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Service Type</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.service_type || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Phone Number</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.user?.phone || selectedOrder.appointment?.user?.phone_number || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Size</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>
                        {(() => {
                          const rawSizes = selectedOrder.appointment?.sizes;
                          if (!rawSizes) return 'N/A';
                          try {
                            const parsed = typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes;
                            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                              return (
                                <>
                                  {Object.entries(parsed).map(([size, qty]) => (
                                    <div key={size}>{size} - {qty}</div>
                                  ))}
                                </>
                              );
                            }
                            return 'N/A';
                          } catch (_) {
                            return 'N/A';
                          }
                        })()}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Quantity</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>
                        {selectedOrder.appointment?.total_quantity || (() => {
                          const rawSizes = selectedOrder.appointment?.sizes;
                          if (!rawSizes) return 0;
                          try {
                            const parsed = typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes;
                            if (parsed && typeof parsed === 'object') {
                              return Object.values(parsed).reduce((a, b) => Number(a) + Number(b), 0);
                            }
                            return 0;
                          } catch (_) {
                            return 0;
                          }
                        })()}
                      </div>
                    </div>
                    {(selectedOrder.status === 'Finished' || selectedOrder.status === 'Completed') && selectedOrder.total_amount && (
                      <div className="detail-group">
                        <div className="detail-label" style={{ fontWeight: 600 }}>Total Payment Fee</div>
                        <div className="detail-value" style={{ fontWeight: 400 }}>₱{selectedOrder.total_amount}</div>
                      </div>
                    )}
                  </div>
                  <div className="details-right">
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Due Date</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.preferred_due_date ? new Date(selectedOrder.appointment.preferred_due_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    {(selectedOrder.status === 'Finished' || selectedOrder.status === 'Completed') && selectedOrder.completed_at && (
                      <div className="detail-group">
                        <div className="detail-label" style={{ fontWeight: 600 }}>Completion Date</div>
                        <div className="detail-value" style={{ fontWeight: 400 }}>{formatDateForDisplay(selectedOrder.completed_at)}</div>
                      </div>
                    )}
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Current Status</div>
                      <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status), fontWeight: 400 }}>
                        {selectedOrder.status === 'Completed' ? 'Finished' : selectedOrder.status}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label" style={{ fontWeight: 600 }}>Notes</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>{selectedOrder.appointment?.notes || 'No notes provided.'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '4px' }}>
                      <div>
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
                          <p style={{ marginBottom: '0' }}>No design image was uploaded.</p>
                        )}
                      </div>
                    </div>
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
  );
};

export default OrdersHistory;
