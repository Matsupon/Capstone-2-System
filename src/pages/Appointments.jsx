import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Appointments.css';
import { FaTrashAlt } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';


const initialAppointments = [
  {
    id: 1,
    time: 'May 2 - 9:30 AM',
    name: 'John Doe',
    service: 'Customize Jersey',
    sizes: { Small: 2, Medium: 3 },
  },
  {
    id: 2,
    time: 'May 1 - 11:00 AM',
    name: 'Jane Smith',
    service: 'Customize Jersey',
    sizes: { Large: 4 },
  },
  {
    id: 3,
    time: 'May 1 - 1:00 PM',
    name: 'Sam Wilson',
    service: 'Customize Jersey',
    sizes: { Small: 1, Medium: 2, Large: 1 },
  },
];

const Appointments = () => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [queueConfirmId, setQueueConfirmId] = useState(null);

  // Simulated details for modal
  const details = {
    service: 'Customize Jersey',
    date: selected ? appointments.find(a => a.id === selected)?.time : '',
    name: selected ? appointments.find(a => a.id === selected)?.name : '',
    phone: '09123456789',
    notes: 'Sample notes for the appointment.',
    sizes: selected ? appointments.find(a => a.id === selected)?.sizes : {},
    dueDate: selected ? appointments.find(a => a.id === selected)?.time : '',
    designImg: 'jersey.jpg',
    gcashImg: 'gcash.png',
  };

  const handleViewDetails = (id) => {
    setSelected(id);
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e8f4fd' }}>
                  <th>Time</th>
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
                    <td>{appt.time}</td>
                    <td>{appt.name}</td>
                    <td>{appt.service}</td>
                    <td>
                      <span className="action-link" onClick={() => handleViewDetails(appt.id)}>View Details</span>
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
          </div>

          {/* View Details Modal */}
          {showDetails && (
            <div className="modal-bg">
              <div className="modal-panel details-modal" style={{ maxHeight: '90vh', width: 'min(700px, 95vw)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                <h2 style={{textAlign: 'center'}}>Appointment Details</h2>
                <div className="details-container" style={{flexWrap: 'wrap'}}>
                  <div className="details-left">
                    <div className="detail-label">Service Type</div>
                    <div className="detail-value">{details.service}</div>
                    <div className="detail-label">Date</div>
                    <div className="detail-value">{details.date}</div>
                    <div className="detail-label">Full Name</div>
                    <div className="detail-value">{details.name}</div>
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value">{details.phone}</div>
                    <div className="detail-label">Size</div>
                    <div className="detail-value">
  {details.sizes && Object.keys(details.sizes).length > 0 ? (
    <>
      {Object.entries(details.sizes).map(([size, qty]) => (
        <div key={size}>{size} - {qty} pcs.</div>
      ))}
    </>
  ) : 'N/A'}
</div>
<div className="detail-label">Quantity</div>
<div className="detail-value">
  {details.sizes ? Object.values(details.sizes).reduce((a, b) => a + b, 0) : 0} pcs.
</div>
                  </div>
                  <div className="details-right">
  <div className="detail-group">
    <div className="detail-label">Due Date</div>
    <div className="detail-value">{details.dueDate}</div>
  </div>
  <div className="detail-group">
    <div className="detail-label">Notes</div>
    <div className="detail-value">{details.notes || 'No notes provided.'}</div>
  </div>
  <div className="image-label">Design Image</div>
  <img src={details.designImg} alt="Design" className="modal-image" />
  <div className="image-label">GCash Proof</div>
  <img src={details.gcashImg} alt="GCash Proof" className="modal-image" />
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