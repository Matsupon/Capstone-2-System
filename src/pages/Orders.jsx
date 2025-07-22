import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Orders.css';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const initialOrders = [
  {
    id: 1,
    queueNumber: '001',
    name: 'Juan Dela Cruz',
    services: 'Customize Jersey',
    status: 'Ready to check',
    dueDate: 'May 30 - 9:30 AM',
    scheduledDateTime: 'May 30 - 9:30 AM',
    designImg: 'jersey.jpg',
    appointmentDate: 'May 28, 2023',
    phoneNumber: '+63 912 345 6789',
    sizes: { Small: 2, Medium: 3 },
    paymentFee: null,
    notes: "Add red stripes on sleeves.",
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
    phoneNumber: '+63 923 456 7890',
    sizes: { Large: 4 },
    paymentFee: null,
    notes: "Add red stripes on sleeves.",
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
    phoneNumber: '+63 934 567 8901',
    sizes: { Small: 1, Medium: 2, Large: 1 },
    paymentFee: 1500,
    notes: "Add red stripes on sleeves.",
  },
];

const Orders = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpdateDropdown, setShowUpdateDropdown] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarOrderId, setCalendarOrderId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState(null);
  const [paymentFee, setPaymentFee] = useState('');

  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const isCurrentMonth = calendarMonth === currentMonth && calendarYear === currentYear;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[calendarMonth];
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array((7 - (firstDayOfMonth + daysInMonth) % 7) % 7).fill(null)
  ];

  const handleCalendarPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleCalendarNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const openCalendarModal = (orderId) => {
    setCalendarOrderId(orderId);
    setShowCalendarModal(true);
    setSelectedDay(null);
    setSelectedTime('');
    setCalendarMonth(currentMonth);
    setCalendarYear(currentYear);
  };

  const closeCalendarModal = () => {
    setShowCalendarModal(false);
    setCalendarOrderId(null);
    setSelectedDay(null);
    setSelectedTime('');
  };

  const handleSetDateTime = () => {
    if (calendarOrderId && selectedDay && selectedTime) {
      const newDueDate = `${monthNames[calendarMonth]} ${selectedDay} - ${selectedTime}`;
      setOrders(orders.map(order =>
        order.id === calendarOrderId
          ? {
              ...order,
              status: 'Ready to check',
              dueDate: newDueDate,
              scheduledDateTime: newDueDate // <-- Add this line
            }
          : order
      ));
      setShowCalendarModal(false);
      setCalendarSuccess(true);
      setTimeout(() => setCalendarSuccess(false), 3000);
    }
  };

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
    if (newStatus === 'Ready to check') {
      openCalendarModal(orderId);
      setShowUpdateDropdown(null);
      return;
    }
    if (newStatus === 'Completed') {
      setPaymentOrderId(orderId);
      setShowPaymentModal(true);
      setShowUpdateDropdown(null);
      return;
    }
    setOrders(orders.map(order =>
      order.id === orderId
        ? { ...order, status: newStatus, scheduledDateTime: undefined }
        : order
    ));
    setShowUpdateDropdown(null);
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const handlePaymentSubmit = () => {
    setOrders(orders.map(order =>
      order.id === paymentOrderId
        ? { ...order, status: 'Completed', paymentFee: paymentFee, scheduledDateTime: undefined }
        : order
    ));
    setShowPaymentModal(false);
    setPaymentOrderId(null);
    setPaymentFee('');
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
                  <th>Order #</th>
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
                    <td>{order.id}</td>
                    <td>{order.queueNumber}</td>
                    <td>{order.name}</td>
                    <td>{order.services}</td>
                    <td>
                      <div>
                        <span style={{ color: getStatusColor(order.status), display: 'block' }}>
                          {order.status}
                        </span>
                        {order.status === 'Ready to check' && order.scheduledDateTime && (
                          <span style={{ fontSize: '12px', color: '#000' }}>
                            ({order.scheduledDateTime})
                          </span>
                        )}
                        {order.status === 'Completed' && order.paymentFee && (
                          <span style={{ fontSize: '12px', color: '#000' }}>
                            (₱{order.paymentFee} total fee)
                          </span>
                        )}
                      </div>
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
              <div className="modal-panel details-modal" style={{ maxHeight: '90vh', width: 'min(700px, 95vw)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                <h2 style={{ textAlign: 'center', marginTop: '10px', marginBottom: '-5px' }}>Order Details</h2>
                <div className="details-container" style={{flexWrap: 'wrap'}}>
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
                      <div className="detail-label">Size</div>
                      <div className="detail-value">
                        {selectedOrder.sizes && Object.keys(selectedOrder.sizes).length > 0 ? (
                          <>
                            {Object.entries(selectedOrder.sizes).map(([size, qty]) => (
                              <div key={size}>{size} - {qty} pcs.</div>
                            ))}
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Quantity</div>
                      <div className="detail-value">
                        {selectedOrder.sizes ? Object.values(selectedOrder.sizes).reduce((a, b) => a + b, 0) : 0} pcs.
                      </div>
                    </div>
                    {selectedOrder.status === 'Completed' && selectedOrder.paymentFee && (
                      <div className="detail-group">
                        <div className="detail-label">Total Payment Fee</div>
                        <div className="detail-value">₱{selectedOrder.paymentFee}</div>
                      </div>
                    )}
                  </div>
                  <div className="details-right">
  <div className="detail-group">
    <div className="detail-label">Due Date</div>
    <div className="detail-value">{selectedOrder.dueDate || 'N/A'}</div>
  </div>
  <div className="detail-group">
    <div className="detail-label">Current Status</div>
    <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status) }}>
      {selectedOrder.status}
    </div>
  </div>
  <div className="detail-group">
    <div className="detail-label">Notes</div>
    <div className="detail-value">{selectedOrder.notes || 'No notes provided.'}</div>
  </div>
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

          {/* Calendar/Time Picker Modal */}
          {showCalendarModal && (
            <div className="orders-calendar-modal-bg" onClick={closeCalendarModal}>
              <div className="orders-calendar-modal-panel" onClick={e => e.stopPropagation()}>
                <div className="orders-calendar-modal-header">
                  <FaTimes className="orders-calendar-modal-exit" onClick={closeCalendarModal} />
                  <h2>Set Date and Time</h2>
                </div>
                <div className="orders-calendar-section">
                  <div className="orders-calendar-header">
                    <button className="orders-nav-btn" onClick={handleCalendarPrevMonth}><FaChevronLeft /></button>
                    <span>{currentMonthName} {calendarYear}</span>
                    <button className="orders-nav-btn" onClick={handleCalendarNextMonth}><FaChevronRight /></button>
                  </div>
                  <div className="orders-calendar-grid">
                    <div className="orders-calendar-days">
                      <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                    </div>
                    <div className="orders-calendar-dates">
                      {calendarDays.map((day, idx) => {
                        let isToday = isCurrentMonth && day === todayDate;
                        let isPast = false;
                        if (day && (calendarYear < currentYear || (calendarYear === currentYear && (calendarMonth < currentMonth || (calendarMonth === currentMonth && day < todayDate))))) {
                          isPast = true;
                        }
                        return (
                          <div
                            key={idx}
                            className={`orders-calendar-date${!day ? ' empty' : ''}${isToday ? ' today' : ''}${isPast ? ' past' : ''}${selectedDay === day ? ' selected' : ''}`}
                            onClick={() => !isPast && day && setSelectedDay(day)}
                          >
                            {day && <span className="orders-date-number">{day}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {selectedDay && (
                  <div className="orders-time-picker-section">
                    <label htmlFor="orders-time-picker">Select Time:</label>
                    <input
                      id="orders-time-picker"
                      type="time"
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="orders-time-picker-input"
                    />
                  </div>
                )}
                <button
                  className="orders-set-date-btn"
                  onClick={handleSetDateTime}
                  disabled={!selectedDay || !selectedTime}
                >
                  Set Date and Time
                </button>
              </div>
            </div>
          )}

          {/* Success Popup for Calendar Set */}
          {calendarSuccess && (
            <div className="orders-calendar-success-popup">
              <h3 style={{ color: '#4caf50', textAlign: 'center' }}>Successfully updated status!</h3>
            </div>
          )}

          {/* Payment Fee Modal */}
          {showPaymentModal && (
            <div className="modal-bg" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}>
              <div className="modal-panel" style={{ maxWidth: 400, margin: '10vh auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ marginBottom: 20, textAlign: 'center' }}>Please provide the total payment fee for this order:</h3>
                <input
                  type="number"
                  min="0"
                  value={paymentFee}
                  onChange={e => setPaymentFee(e.target.value)}
                  style={{ width: '100%', padding: 10, fontSize: 18, marginBottom: 24, borderRadius: 6, border: '1px solid #ccc' }}
                  placeholder="Enter fee (₱)"
                />
                <button
                  className="modal-button"
                  style={{ width: '100%', fontSize: 18, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                  onClick={handlePaymentSubmit}
                  disabled={!paymentFee || isNaN(paymentFee) || Number(paymentFee) <= 0}
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;