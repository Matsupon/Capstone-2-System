import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Appointments.css';
import { FaTrashAlt } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);
  const [queueConfirmId, setQueueConfirmId] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [unviewedAppointmentIds, setUnviewedAppointmentIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectAppointmentId, setRejectAppointmentId] = useState(null);
  const [refundImage, setRefundImage] = useState(null);
  const [refundImagePreview, setRefundImagePreview] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectSuccess, setRejectSuccess] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setError('No admin token found');
          setIsLoading(false);
          return;
        }

        console.log('=== DEBUGGING API CALLS ===');
        console.log('Admin token:', token);
        console.log('Using proxy configuration from package.json');
        console.log('Full admin endpoint URL: /api/admin/appointments');
        console.log('Full original endpoint URL: /api/appointments');
        
        let response;
        try {
          console.log('Trying admin endpoint...');
          response = await api.get('/admin/appointments');
          console.log('Admin endpoint response:', response);
          
          if (response.data.success && response.data.data) {
            setAppointments(response.data.data);
          } else if (Array.isArray(response.data)) {
            setAppointments(response.data);
          } else {
            throw new Error('Invalid response format from server');
          }
          
          setIsLoading(false);
          setError(null);
          return;
        } catch (adminError) {
          console.log('Admin endpoint failed:', adminError);
          console.log('Admin error response:', adminError.response);
          
          try {
            console.log('Trying original endpoint...');
            response = await api.get('/appointments');
            console.log('Original endpoint response:', response);
            
            if (Array.isArray(response.data)) {
              setAppointments(response.data);
              setIsLoading(false);
              setError(null);
              return;
            } else {
              throw new Error('Invalid response format from original endpoint');
            }
          } catch (originalError) {
            console.error('Both endpoints failed:', { adminError, originalError });
            console.log('Original error response:', originalError.response);
            throw new Error('Failed to fetch appointments from both endpoints');
          }
        }
        
      } catch (err) {
        console.error('Final error in fetchAppointments:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    const fetchViewStates = async () => {
      try {
        const res = await api.get('/notifications/appointments/view-states');
        if (res.data?.success) {
          const items = res.data.data || [];
          const unviewed = new Set(items.filter(i => !i.is_viewed).map(i => i.appointment_id));
          setUnviewedAppointmentIds(unviewed);
        }
      } catch (_) {}
    };

    fetchAppointments();
    fetchViewStates();
    
    // Refresh appointments every 5 seconds to reflect cancellations
    const refreshInterval = setInterval(() => {
      fetchAppointments();
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, [navigate]);

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    const [hours, minutes] = timeString.split(':');
    const hourInt = parseInt(hours, 10);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    const formattedHour = hourInt % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"];
    
    const date = new Date(dateString);
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"];
    
    const date = new Date(dateString);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = formatTime(timeString);
    
    return `${month} ${day} - ${time}`;
  };

  const handleViewDetails = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
    
    // Optimistically update UI immediately for better UX
    setUnviewedAppointmentIds(prev => {
      if (!prev.has(appointment.id)) return prev;
      const next = new Set(prev);
      next.delete(appointment.id);
      return next;
    });
    
    // Update database - mark appointment as viewed
    try {
      const response = await api.patch(`/notifications/appointments/${appointment.id}/viewed`);
      console.log('Appointment marked as viewed:', response.data);
      
      // Refresh view states to ensure consistency with database
      try {
        const res = await api.get('/notifications/appointments/view-states');
        if (res.data?.success) {
          const items = res.data.data || [];
          const unviewed = new Set(items.filter(i => !i.is_viewed).map(i => i.appointment_id));
          setUnviewedAppointmentIds(unviewed);
        }
      } catch (refreshError) {
        console.error('Failed to refresh view states:', refreshError);
        // Don't revert the optimistic update - user already viewed it
      }
    } catch (err) {
      console.error('Failed to mark appointment as viewed:', err);
      // Don't revert the optimistic update - user already viewed it
      // The error is logged but UI remains updated for better UX
    }
  };

  const handleImageClick = (imageSrc, imageAlt) => {
    setSelectedImage({ src: imageSrc, alt: imageAlt });
    setShowImageModal(true);
  };

  const handleAddToQueue = (id) => {
    setQueueConfirmId(id);
  };

  const confirmAddToQueue = async () => {
    try {
      await api.post(`/orders/${queueConfirmId}`);
      setAppointments(appointments.filter(a => a.id !== queueConfirmId));
      setQueueConfirmId(null);
      setQueueSuccess(true);
      setTimeout(() => setQueueSuccess(false), 5000);
    } catch (err) {
      console.error("Failed to accept appointment:", err);
      setQueueConfirmId(null);
      setError("Failed to add appointment to queue. Please try again.");
    }
  };


  const handleRemove = (id) => {
    setRejectAppointmentId(id);
    setShowRejectModal(true);
  };

  const handleRefundImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRefundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefundImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRejectAppointment = async () => {
    if (!refundImage) {
      alert('Please upload a GCash refund image before rejecting this appointment.');
      return;
    }

    try {
      setRejecting(true);
      const formData = new FormData();
      formData.append('refund_image', refundImage);

      await api.post(`/admin/appointments/${rejectAppointmentId}/reject`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAppointments(appointments.filter(a => a.id !== rejectAppointmentId));
      setShowRejectModal(false);
      setRejectAppointmentId(null);
      setRefundImage(null);
      setRefundImagePreview(null);
      setRejectSuccess(true);
      setTimeout(() => setRejectSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reject appointment:', err);
      setError(err.response?.data?.message || 'Failed to reject appointment. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = appointments.slice(startIndex, endIndex);

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

  return (
    <>
      <div className="page-title">
        <h1>APPOINTMENTS</h1>
      </div>
      
      <div className="appointments-content">
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '24px 24px 8px 24px', margin: '0 16px' }}>
            {isLoading ? (
              <p>Loading appointments...</p>
            ) : error ? (
              <p>Error: {error}</p>
            ) : appointments.length === 0 ? (
              <p>No appointments found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr style={{ background: '#e8f4fd' }}>
      <th>Date & Time</th>
      <th>Name</th>
      <th>Service</th>
      <th>Action</th>
      <th>Add to Queue</th>
      <th>Reject</th>
    </tr>
  </thead>
  <tbody>
    {currentAppointments.map((appt) => (
      <tr key={appt.id} style={unviewedAppointmentIds.has(appt.id) ? { background: '#e6f0ff' } : {}}>
        <td>{formatDateTime(appt.appointment_date, appt.appointment_time)}</td>
        <td>{appt.user?.name || 'N/A'}</td>
        <td>{appt.service_type}</td>
        <td>
          <span
            className="action-link"
            onClick={() => handleViewDetails(appt)}
            style={{ color: '#007bff', cursor: 'pointer' }}
          >
            View Details
          </span>
        </td>
                      <td>
                        <input 
                          type="checkbox" 
                          onChange={() => handleAddToQueue(appt.id)}
                          checked={queueConfirmId === appt.id}
                        />
                      </td>
                      <td>
                        <FaTrashAlt className="delete-icon" onClick={() => handleRemove(appt.id)} style={{ color: '#ef4444', cursor: 'pointer' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Panel - Fixed at bottom */}
          {!isLoading && !error && appointments.length > 0 && totalPages > 1 && (
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
              </div>
            </div>
          )}

          {/* View Details Modal (match Orders dashboard modal design) */}
          {showDetails && selectedAppointment && (
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
                <h2 className="dashboard-modal-title">Appointment Details</h2>
                <div className="details-container" style={{ flexWrap: 'wrap', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
                  <div className="details-left">
                    <div className="detail-group">
                      <div className="detail-label">Service Type</div>
                      <div className="detail-value">{selectedAppointment.service_type || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Appointment Date</div>
                      <div className="detail-value">{formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time)}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Full Name</div>
                      <div className="detail-value">{selectedAppointment.user?.name || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Phone Number</div>
                      <div className="detail-value">{selectedAppointment.user?.phone || 'N/A'}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Size</div>
                      <div className="detail-value">
                        {(() => {
                          const rawSizes = selectedAppointment.sizes;
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
                      <div className="detail-label">Quantity</div>
                      <div className="detail-value">
                        {selectedAppointment.total_quantity || (() => {
                          const rawSizes = selectedAppointment.sizes;
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
                  </div>
                  <div className="details-right">
                    <div className="detail-group">
                      <div className="detail-label">Due Date</div>
                      <div className="detail-value">
                        {selectedAppointment.preferred_due_date ? formatDate(selectedAppointment.preferred_due_date) : 'N/A'}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Notes</div>
                      <div className="detail-value">{selectedAppointment.notes || 'No notes provided.'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '4px' }}>
                      <div>
                        <div className="image-label">Design Image</div>
                        {selectedAppointment.design_image ? (
                          <img 
                            src={selectedAppointment.design_image} 
                            alt="Jersey Design"
                            className="modal-image"
                            onClick={() => handleImageClick(
                              selectedAppointment.design_image,
                              'Design Image'
                            )}
                            onError={(e) => {
                              console.error('Failed to load design image:', e.target.src);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center', borderRadius: '4px', marginBottom: '8px' }}>
                            No design image uploaded
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="image-label">GCash Proof</div>
                        {selectedAppointment.gcash_proof ? (
                          <img 
                            src={selectedAppointment.gcash_proof} 
                            alt="GCash Payment"
                            className="modal-image"
                            onClick={() => handleImageClick(
                              selectedAppointment.gcash_proof,
                              'GCash Payment Proof'
                            )}
                            onError={(e) => {
                              console.error('Failed to load GCash proof image:', e.target.src);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center', borderRadius: '4px', marginBottom: '8px' }}>
                            No GCash proof uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Queue Confirmation Modal */}
          {queueConfirmId !== null && (
            <div className="dashboard-modal-bg animate-fade" onClick={() => setQueueConfirmId(null)}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 20, textAlign: 'center' }}>Add this appointment to the queue?</h3>
                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={() => setQueueConfirmId(null)}
                  >
                    No
                  </button>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={confirmAddToQueue}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add to Queue Success Popup */}
          {queueSuccess && (
            <div className="popup-queue-success">
              <h3>User appointment successfully accepted!</h3>
              <div>View appointment details at the Orders Page</div>
            </div>
          )}

          {/* Reject Appointment Modal with Refund Image Upload */}
          {showRejectModal && (
            <div className="dashboard-modal-bg animate-fade" onClick={() => {
              setShowRejectModal(false);
              setRefundImage(null);
              setRefundImagePreview(null);
            }}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 500, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                <AiOutlineClose
                  className="dashboard-modal-exit-icon"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRefundImage(null);
                    setRefundImagePreview(null);
                  }}
                  style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer' }}
                />
                <h3 style={{ marginBottom: 20, textAlign: 'center', marginTop: 10 }}>Reject Appointment</h3>
                <p style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
                  Please upload a GCash refund image before rejecting this appointment.
                </p>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#333' }}>
                    GCash Refund Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRefundImageChange}
                    style={{ marginBottom: 12, width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
                  />
                  {refundImagePreview && (
                    <div style={{ marginTop: 12 }}>
                      <img
                        src={refundImagePreview}
                        alt="Refund preview"
                        style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => handleImageClick(refundImagePreview, 'Refund Preview')}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={() => {
                      setShowRejectModal(false);
                      setRefundImage(null);
                      setRefundImagePreview(null);
                    }}
                    disabled={rejecting}
                  >
                    Cancel
                  </button>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: rejecting || !refundImage ? 'not-allowed' : 'pointer', opacity: rejecting || !refundImage ? 0.6 : 1 }}
                    onClick={handleRejectAppointment}
                    disabled={rejecting || !refundImage}
                  >
                    {rejecting ? 'Rejecting...' : 'Reject Order'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Success Popup */}
          {rejectSuccess && (
            <div className="popup-delete-success">
              <h3>Appointment Successfully Rejected!</h3>
            </div>
          )}

          {/* Image Modal for Zoom */}
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
    </>
  );
};

export default Appointments;