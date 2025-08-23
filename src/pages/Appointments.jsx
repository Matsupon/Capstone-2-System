import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
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
  const [queueSuccess, setQueueSuccess] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [queueConfirmId, setQueueConfirmId] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch appointments data
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
        
        // Try admin endpoint first using the configured api instance
        let response;
        try {
          console.log('Trying admin endpoint...');
          response = await api.get('/admin/appointments');
          console.log('Admin endpoint response:', response);
          
          // Check if the response has the expected structure
          if (response.data.success && response.data.data) {
            setAppointments(response.data.data);
          } else if (Array.isArray(response.data)) {
            // Fallback for legacy response format
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
          
          // If admin endpoint fails, try the original endpoint
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

    fetchAppointments();
  }, [navigate]);

  // Helper function to format time in 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    const [hours, minutes] = timeString.split(':');
    const hourInt = parseInt(hours, 10);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    const formattedHour = hourInt % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Helper function to format date as "Month Day" (e.g., "May 10")
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"];
    
    const date = new Date(dateString);
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  // Helper function to format date and time as "Month Day - Time" (e.g., "May 10 - 9:30 AM")
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
  };

  const handleAddToQueue = (id) => {
    setQueueConfirmId(id);
  };

  const confirmAddToQueue = () => {
    setAppointments(appointments.filter(a => a.id !== queueConfirmId));
    setQueueConfirmId(null);
    setQueueSuccess(true);
    setTimeout(() => setQueueSuccess(false), 5000); // 5 seconds
  };

  const handleRemove = (id) => {
    setRemoveId(id);
  };

  const confirmRemove = () => {
    setAppointments(appointments.filter(a => a.id !== removeId));
    setRemoveId(null);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>APPOINTMENTS</h1>
        </div>
        
        <div className="appointments-content">
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 24 }}>
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
                    <tr key={appt.id}>
                      <td>{formatDateTime(appt.appointment_date, appt.appointment_time)}</td>
                      <td>{appt.user?.name || 'N/A'}</td>
                      <td>{appt.service_type}</td>
                      <td>
                        <span className="action-link" onClick={() => handleViewDetails(appt)}>View Details</span>
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

          {/* View Details Modal */}
          {showDetails && selectedAppointment && (
            <div className="modal-bg">
              <div className="modal-panel details-modal" style={{ maxHeight: '90vh', width: 'min(700px, 95vw)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                <h2 style={{textAlign: 'center'}}>Appointment Details</h2>
                <div className="details-container" style={{flexWrap: 'wrap'}}>
                  <div className="details-left">
                    <div className="detail-label">Service Type</div>
                    <div className="detail-value">{selectedAppointment.service_type || 'N/A'}</div>
                    <div className="detail-label">Date</div>
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
                        style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
                      />
                    ) : (
                      <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                        No design image uploaded
                      </div>
                    )}
                    <div className="image-label">GCash Proof</div>
                    {selectedAppointment.gcash_proof ? (
                      <img 
                        src={selectedAppointment.gcash_proof} 
                        alt="GCash Payment"
                        className="modal-image"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
                      />
                    ) : (
                      <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                        No GCash proof uploaded
                      </div>
                    )}
                  </div>
                </div>
                <AiOutlineClose className="modal-exit-icon" onClick={() => setShowDetails(false)} />
              </div>
            </div>
          )}

          {/* Queue Confirmation Modal */}
          {queueConfirmId !== null && (
            <div className="modal-bg">
              <div className="modal-panel queue-confirm-modal">
                <h3>Add this appointment to the queue?</h3>
                <div className="queue-confirm-btns">
                  <button className="yes" onClick={confirmAddToQueue}>Yes</button>
                  <button className="no" onClick={() => setQueueConfirmId(null)}>No</button>
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
            <div className="modal-bg">
              <div className="modal-panel remove-modal">
                <h3>Are you sure you want to delete this appointment?</h3>
                <div className="remove-btns">
                  <button className="yes" onClick={confirmRemove}>Yes</button>
                  <button className="no" onClick={() => setRemoveId(null)}>No</button>
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
        </div>
      </div>
    </div>
  );
};

export default Appointments;