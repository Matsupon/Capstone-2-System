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
  const [removeId, setRemoveId] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [queueConfirmId, setQueueConfirmId] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [unviewedAppointmentIds, setUnviewedAppointmentIds] = useState(new Set());

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

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
    api.patch(`/notifications/appointments/${appointment.id}/viewed`).catch(() => {});
    setUnviewedAppointmentIds(prev => {
      if (!prev.has(appointment.id)) return prev;
      const next = new Set(prev);
      next.delete(appointment.id);
      return next;
    });
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
    setRemoveId(id);
  };

  const confirmRemove = () => {
    const deleteAppointment = async () => {
      try {
        await api.delete(`/appointments/${removeId}`);
        setAppointments(appointments.filter(a => a.id !== removeId));
        setRemoveId(null);
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to delete appointment:', err);
        setError('Failed to delete appointment. Please try again.');
        setRemoveId(null);
      }
    };

    deleteAppointment();
  };

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
      <th>Remove</th>
    </tr>
  </thead>
  <tbody>
    {appointments.map((appt) => (
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
                        <FaTrashAlt className="delete-icon" onClick={() => handleRemove(appt.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

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
                <div className="details-container" style={{ flexWrap: 'wrap', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', paddingRight: 8 }}>
                  <div className="details-left">
                    <div className="detail-label">Service Type</div>
                    <div className="detail-value">{selectedAppointment.service_type || 'N/A'}</div>
                    <div className="detail-label">Appointment Date</div>
                    <div className="detail-value">{formatDateTime(selectedAppointment.appointment_date, selectedAppointment.appointment_time)}</div>
                    <div className="detail-label">Full Name</div>
                    <div className="detail-value">{selectedAppointment.user?.name || 'N/A'}</div>
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value">{selectedAppointment.user?.phone || 'N/A'}</div>
                    <div className="detail-label">Size</div>
                    <div className="detail-value">
                      {selectedAppointment.sizes && typeof selectedAppointment.sizes === 'object' && Object.keys(selectedAppointment.sizes).length > 0 ? (
                        <>
                          {Object.entries(selectedAppointment.sizes).map(([size, qty]) => (
                            <div key={size}>{size} - {qty} pcs.</div>
                          ))}
                        </>
                      ) : selectedAppointment.sizes ? (
                        selectedAppointment.sizes
                      ) : 'N/A'}
                    </div>
                    <div className="detail-label">Quantity</div>
                    <div className="detail-value">
                      {selectedAppointment.total_quantity ? `${selectedAppointment.total_quantity} pcs.` : 'N/A'}
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
                    <div className="image-label">Design Image</div>
                    {selectedAppointment.design_image ? (
                      <img 
                        src={selectedAppointment.design_image} 
                        alt="Jersey Design"
                        className="modal-image"
                        style={{ 
                          width: '100%', 
                          height: '120px', 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onClick={() => handleImageClick(
                          selectedAppointment.design_image,
                          'Design Image'
                        )}
                        onError={(e) => {
                          console.error('Failed to load design image:', e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : (
                      <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                        No design image uploaded
                      </div>
                    )}
                    {selectedAppointment.design_image && (
                      <p style={{ display: 'none', color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>
                        Failed to load design image. The file may have been moved or deleted.
                      </p>
                    )}
                    <div className="image-label">GCash Proof</div>
                    {selectedAppointment.gcash_proof ? (
                      <img 
                        src={selectedAppointment.gcash_proof} 
                        alt="GCash Payment"
                        className="modal-image"
                        style={{ 
                          width: '100%', 
                          height: '120px', 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onClick={() => handleImageClick(
                          selectedAppointment.gcash_proof,
                          'GCash Payment Proof'
                        )}
                        onError={(e) => {
                          console.error('Failed to load GCash proof image:', e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : (
                      <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                        No GCash proof uploaded
                      </div>
                    )}
                    {selectedAppointment.gcash_proof && (
                      <p style={{ display: 'none', color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>
                        Failed to load GCash proof image. The file may have been moved or deleted.
                      </p>
                    )}
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

          {/* Remove Confirmation Modal */}
          {removeId !== null && (
            <div className="dashboard-modal-bg animate-fade" onClick={() => setRemoveId(null)}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 20, textAlign: 'center' }}>Are you sure you want to delete this appointment?</h3>
                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={confirmRemove}
                  >
                    Yes
                  </button>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={() => setRemoveId(null)}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Success Popup */}
          {deleteSuccess && (
            <div className="popup-delete-success">
              <h3>Appointment Successfully Deleted!</h3>
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