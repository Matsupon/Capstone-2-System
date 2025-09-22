import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Orders.css';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const formatTimeToAMPM = (timeString) => {
  if (!timeString) return '';

  console.log('formatTimeToAMPM input:', timeString);
  
  const [hours, minutes] = timeString.split(':').map(Number);

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;

  const result = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  console.log('formatTimeToAMPM result:', result);
  
  return result;
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpdateDropdown, setShowUpdateDropdown] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showCompletionCalendar, setShowCompletionCalendar] = useState(false);
  const [calendarOrderId, setCalendarOrderId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedCheckTimes, setBookedCheckTimes] = useState([]);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState(null);
  const [paymentFee, setPaymentFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [orderToFinish, setOrderToFinish] = useState(null);
  const [completionCalendarMonth, setCompletionCalendarMonth] = useState(new Date().getMonth());
  const [completionCalendarYear, setCompletionCalendarYear] = useState(new Date().getFullYear());
  const [completionSelectedDay, setCompletionSelectedDay] = useState(null);
  const [completionSelectedTime, setCompletionSelectedTime] = useState('');
  const [bookedPickupTimes, setBookedPickupTimes] = useState([]);

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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      if (response.data.success) {
        console.log('Orders data received:', response.data.data.map(order => ({
          id: order.id,
          status: order.status,
          scheduled_at: order.scheduled_at,
          completed_at: order.completed_at,
          check_appointment_date: order.check_appointment_date,
          check_appointment_time: order.check_appointment_time
        })));
        
        setOrders(response.data.data);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCalendarPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleSetDateTime = async () => {
    if (calendarOrderId && selectedDay && selectedTime) {
      try {
        const formattedDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const scheduledAt = `${formattedDate} ${selectedTime}`;
        
        const response = await api.patch(`/orders/${calendarOrderId}/status`, {
          status: 'Ready to Check',
          scheduled_at: scheduledAt,
          check_appointment_date: formattedDate,
          check_appointment_time: selectedTime,
        });

        if (response.data.success) {
          setOrders(orders.map(order =>
            order.id === calendarOrderId
              ? {
                  ...order,
                  status: 'Ready to Check',
                  scheduled_at: scheduledAt,
                  check_appointment_date: formattedDate,
                  check_appointment_time: selectedTime,
                }
              : order
          ));
          setShowCalendarModal(false);
          setCalendarSuccess(true);
          setTimeout(() => setCalendarSuccess(false), 3000);
        }
      } catch (err) {
        console.error('Error updating order status:', err);
        setError('Failed to update order status');
      }
    }
  };

  const handleSetCompletionDateTime = async () => {
    if (calendarOrderId && completionSelectedDay && completionSelectedTime) {
      try {
        const formattedDate = `${completionCalendarYear}-${String(completionCalendarMonth + 1).padStart(2, '0')}-${String(completionSelectedDay).padStart(2, '0')}`;
        const completedAt = `${formattedDate} ${completionSelectedTime}`;
        
        setOrders(orders.map(order =>
          order.id === calendarOrderId
            ? {
                ...order,
                completionDateTime: completedAt,
                pickup_appointment_date: formattedDate,
                pickup_appointment_time: completionSelectedTime,
              }
            : order
        ));
        
        setPaymentOrderId(calendarOrderId);
        setShowCompletionCalendar(false);
        setShowPaymentModal(true);
      } catch (err) {
        console.error('Error setting completion date:', err);
        setError('Failed to set completion date');
      }
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

  const handleCompletionCalendarPrevMonth = () => {
    if (completionCalendarMonth === 0) {
      setCompletionCalendarMonth(11);
      setCompletionCalendarYear(completionCalendarYear - 1);
    } else {
      setCompletionCalendarMonth(completionCalendarMonth - 1);
    }
  };

  const handleCompletionCalendarNextMonth = () => {
    if (completionCalendarMonth === 11) {
      setCompletionCalendarMonth(0);
      setCompletionCalendarYear(completionCalendarYear + 1);
    } else {
      setCompletionCalendarMonth(completionCalendarMonth + 1);
    }
  };

  const openCalendarModal = (orderId) => {
    setCalendarOrderId(orderId);
    setShowCalendarModal(true);
    setSelectedDay(null);
    setSelectedTime('');
    setCalendarMonth(currentMonth);
    setCalendarYear(currentYear);
    setBookedCheckTimes([]);
  };

  const openCompletionCalendarModal = (orderId) => {
    setCalendarOrderId(orderId);
    setShowCompletionCalendar(true);
    setCompletionSelectedDay(null);
    setCompletionSelectedTime('');
    setCompletionCalendarMonth(currentMonth);
    setCompletionCalendarYear(currentYear);
    setBookedPickupTimes([]);
  };

  const closeCalendarModal = () => {
    setShowCalendarModal(false);
    setCalendarOrderId(null);
    setSelectedDay(null);
    setSelectedTime('');
    setBookedCheckTimes([]);
  };

  const closeCompletionCalendarModal = () => {
    setShowCompletionCalendar(false);
    setCalendarOrderId(null);
    setCompletionSelectedDay(null);
    setCompletionSelectedTime('');
    setBookedPickupTimes([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready to Check':
        return '#e91e63';
      case 'Pending':
        return '#ff9800';
      case 'Completed':
        return '#4caf50';
      case 'Finished':
        return '#4caf50';
      default:
        return '#333';
    }
  };

  const handleViewFile = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (newStatus === 'Ready to Check') {
      openCalendarModal(orderId);
      setShowUpdateDropdown(null);
      return;
    }
    if (newStatus === 'Completed') {
      openCompletionCalendarModal(orderId);
      setShowUpdateDropdown(null);
      return;
    }
    if (newStatus === 'Finished') {
      const order = orders.find(o => o.id === orderId);
      setOrderToFinish(order);
      setShowFinishConfirmation(true);
      setShowUpdateDropdown(null);
      return;
    }
    
    try {
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        setOrders(orders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, scheduled_at: undefined }
            : order
        ));
        setShowUpdateDropdown(null);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status');
    }
  };

  const handleFinishOrder = async () => {
    if (!orderToFinish) return;
    
    try {
      const response = await api.patch(`/orders/${orderToFinish.id}/status`, {
        status: 'Finished'
      });

      if (response.data.success) {
        setOrders(orders.filter(order => order.id !== orderToFinish.id));
        setShowFinishConfirmation(false);
        setOrderToFinish(null);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error finishing order:', err);
      setError('Failed to finish order');
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      const order = orders.find(o => o.id === paymentOrderId);
      const pickupDate = order.pickup_appointment_date;
      const pickupTime = order.pickup_appointment_time;
      
      const response = await api.patch(`/orders/${paymentOrderId}/status`, {
        status: 'Completed',
        scheduled_at: order.completionDateTime, 
        total_amount: paymentFee,
        pickup_appointment_date: pickupDate, 
        pickup_appointment_time: pickupTime,
      });
  
      if (response.data.success) {
        const updated = response.data.data;
        setOrders(orders.map(o => (o.id === paymentOrderId ? { ...o, ...updated } : o)));
        setShowPaymentModal(false);
        setCalendarSuccess(true);
        setTimeout(() => setCalendarSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
      setError('Failed to submit payment');
    }
  };

  const toggleUpdateDropdown = (orderId) => {
    setShowUpdateDropdown(showUpdateDropdown === orderId ? null : orderId);
  };

  const handleImageClick = (imageSrc, imageAlt) => {
    setSelectedImage({ src: imageSrc, alt: imageAlt });
    setShowImageModal(true);
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    console.log('formatDateForDisplay input:', dateString);
    if (dateString.includes(' ') && dateString.includes(':')) {
      try {
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          throw new Error('Invalid datetime format');
        }
        
        const monthName = monthNames[month - 1]; 
        const time = formatTimeToAMPM(timePart);
        
        console.log('Parsed datetime:', { datePart, timePart, monthName, day, time });
        console.log('Final formatted string:', `${monthName} ${day} - ${time}`);
        
        return `${monthName} ${day} - ${time}`;
      } catch (error) {
        console.warn('Error parsing datetime string:', dateString, error);
        const date = new Date(dateString);
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const time = formatTimeToAMPM(date.toTimeString().split(' ')[0]);
        return `${month} ${day} - ${time}`;
      }
    } else {
      const date = new Date(dateString);
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      
      return `${month} ${day}`;
    }
  };

  const formatDateAndTime = (dateString, timeString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = formatTimeToAMPM(timeString);
    return `${month} ${day} - ${time}`;
  };

  const isTimeSlotBooked = (time, kind) => {
    if (kind === 'check') {
      return bookedCheckTimes.includes(time);
    }
    if (kind === 'pickup') {
      return bookedPickupTimes.includes(time);
    }
    return false;
  };
  useEffect(() => {
    const fetch = async () => {
      if (showCalendarModal && selectedDay) {
        const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        try {
          const res = await api.get('/orders/booked-times', { params: { date, kind: 'check' } });
          setBookedCheckTimes(res.data?.booked_times || []);
        } catch (_) {
          setBookedCheckTimes([]);
        }
      }
    };
    fetch();
  }, [showCalendarModal, selectedDay, calendarMonth, calendarYear]);

  useEffect(() => {
    const fetch = async () => {
      if (showCompletionCalendar && completionSelectedDay) {
        const date = `${completionCalendarYear}-${String(completionCalendarMonth + 1).padStart(2, '0')}-${String(completionSelectedDay).padStart(2, '0')}`;
        try {
          const res = await api.get('/orders/booked-times', { params: { date, kind: 'pickup' } });
          setBookedPickupTimes(res.data?.booked_times || []);
        } catch (_) {
          setBookedPickupTimes([]);
        }
      }
    };
    fetch();
  }, [showCompletionCalendar, completionSelectedDay, completionCalendarMonth, completionCalendarYear]);
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
        const time = `${hourStr}:${minuteStr}`;
        slots.push(time);
      }
    }
    return slots;
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title">
            <h1>ORDERS</h1>
          </div>
          <div className="orders-content">
            <p>Loading orders...</p>
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
            <h1>ORDERS</h1>
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
                  <th>Next Appoint.</th>
                  <th>Layout/Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.queue_number}</td>
                    <td>{order.appointment?.user?.name || 'N/A'}</td>
                    <td>{order.appointment?.service_type || 'N/A'}</td>
                    <td>
                      <div>
                        <span style={{ color: getStatusColor(order.status), display: 'block' }}>
                          {order.status}
                        </span>
                        {order.status === 'Completed' && order.total_amount && (
                          <span style={{ fontSize: '12px', color: '#000' }}>
                            (₱{order.total_amount} total fee)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
  {/* NEXT APPOINT COLUMN */}
  {order.status === 'Ready to Check' && order.check_appointment_date && order.check_appointment_time && (
    <span>{formatDateAndTime(order.check_appointment_date, order.check_appointment_time)}</span>
  )}
  {order.status === 'Pending' && (
    order.appointment?.appointment_date && order.appointment?.appointment_time ? (
      <span>{formatDateAndTime(order.appointment.appointment_date, order.appointment.appointment_time)}</span>
    ) : order.appointment?.preferred_due_date ? (
      <span>{formatDateForDisplay(order.appointment.preferred_due_date)}</span>
    ) : (
      <span>N/A</span>
    )
  )}
  {order.status === 'Completed' && order.pickup_appointment_date && order.pickup_appointment_time && (
    <span>{formatDateAndTime(order.pickup_appointment_date, order.pickup_appointment_time)}</span>
  )}
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
                              onClick={() => handleUpdateStatus(order.id, 'Ready to Check')}
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
                            <div
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Finished')}
                            >
                              Finished
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
                      <div className="detail-label">Queue Number</div>
                      <div className="detail-value">{selectedOrder.queue_number}</div>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">Appointment Date Accepted</div>
                      <div className="detail-value">{selectedOrder.appointment?.appointment_date ? new Date(selectedOrder.appointment.appointment_date).toLocaleDateString() : 'N/A'}</div>
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
                    {selectedOrder.status === 'Completed' && selectedOrder.total_amount && (
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
                    {selectedOrder.status === 'Completed' && selectedOrder.completed_at && (
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
                        src={selectedOrder.appointment.design_image} 
                        alt="Design" 
                        className="modal-image"
                        onClick={() => handleImageClick(
                          selectedOrder.appointment.design_image,
                          'Design Image'
                        )}
                        onError={(e) => {
                          console.error('Failed to load image:', e.target.src);
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

          {/* Update Success Popup */}
          {updateSuccess && (
            <div className="popup-success">
              <h3 style={{ color: '#4caf50' }}>Update changed successfully!</h3>
            </div>
          )}

          {/* Calendar/Time Picker Modal (for Ready to Check) */}
          {showCalendarModal && (
            <div className="orders-calendar-modal-bg" onClick={closeCalendarModal}>
              <div className="orders-calendar-modal-panel" onClick={e => e.stopPropagation()}>
                <div className="orders-calendar-modal-header">
                  <FaTimes className="orders-calendar-modal-exit" onClick={closeCalendarModal} />
                  <h2>Set Due Date and Time</h2>
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
                    <select
                      id="orders-time-picker"
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="orders-time-picker-input"
                    >
                      <option value="">Select a time</option>
                      {generateTimeSlots().map(time => (
                        <option 
                          key={time} 
                          value={time}
                          disabled={isTimeSlotBooked(time, 'check')}
                        >
                          {formatTimeToAMPM(time)} {isTimeSlotBooked(time, 'check') ? '(Already chosen)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className="orders-set-date-btn"
                  onClick={handleSetDateTime}
                  disabled={!selectedDay || !selectedTime}
                >
                  Set Due Date and Time
                </button>
              </div>
            </div>
          )}

          {/* Completion Calendar Modal */}
          {showCompletionCalendar && (
            <div className="orders-calendar-modal-bg" onClick={closeCompletionCalendarModal}>
              <div className="orders-calendar-modal-panel" onClick={e => e.stopPropagation()}>
                <div className="orders-calendar-modal-header">
                  <FaTimes className="orders-calendar-modal-exit" onClick={closeCompletionCalendarModal} />
                  <h2>Set Completion Date and Time</h2>
                </div>
                <div className="orders-calendar-section">
                  <div className="orders-calendar-header">
                    <button className="orders-nav-btn" onClick={handleCompletionCalendarPrevMonth}><FaChevronLeft /></button>
                    <span>{monthNames[completionCalendarMonth]} {completionCalendarYear}</span>
                    <button className="orders-nav-btn" onClick={handleCompletionCalendarNextMonth}><FaChevronRight /></button>
                  </div>
                  <div className="orders-calendar-grid">
                    <div className="orders-calendar-days">
                      <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                    </div>
                    <div className="orders-calendar-dates">
                      {calendarDays.map((day, idx) => {
                        const isToday = completionCalendarMonth === currentMonth && 
                                        completionCalendarYear === currentYear && 
                                        day === todayDate;
                        const isPast = day && (
                          completionCalendarYear < currentYear || 
                          (completionCalendarYear === currentYear && 
                          (completionCalendarMonth < currentMonth || 
                          (completionCalendarMonth === currentMonth && day < todayDate)))
                        );
                        
                        return (
                          <div
                            key={idx}
                            className={`orders-calendar-date${!day ? ' empty' : ''}${isToday ? ' today' : ''}${isPast ? ' past' : ''}${completionSelectedDay === day ? ' selected' : ''}`}
                            onClick={() => !isPast && day && setCompletionSelectedDay(day)}
                          >
                            {day && <span className="orders-date-number">{day}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {completionSelectedDay && (
                  <div className="orders-time-picker-section">
                    <label htmlFor="orders-completion-time-picker">Select Time:</label>
                    <select
                      id="orders-completion-time-picker"
                      value={completionSelectedTime}
                      onChange={e => setCompletionSelectedTime(e.target.value)}
                      className="orders-time-picker-input"
                    >
                      <option value="">Select a time</option>
                      {generateTimeSlots().map(time => (
                        <option 
                          key={time} 
                          value={time}
                          disabled={isTimeSlotBooked(time, 'pickup')}
                        >
                          {formatTimeToAMPM(time)} {isTimeSlotBooked(time, 'pickup') ? '(Already chosen)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className="orders-set-date-btn"
                  onClick={handleSetCompletionDateTime}
                  disabled={!completionSelectedDay || !completionSelectedTime}
                >
                  Set Completion Date and Time
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
                  Submit Payment
                </button>
              </div>
            </div>
          )}

          {/* Finish Confirmation Modal */}
          {showFinishConfirmation && orderToFinish && (
            <div className="modal-bg" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}>
              <div className="modal-panel" style={{ maxWidth: 400, margin: '10vh auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ marginBottom: 20, textAlign: 'center' }}>Are you sure the Order is Finished?</h3>
                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={() => {
                      setShowFinishConfirmation(false);
                      setOrderToFinish(null);
                    }}
                  >
                    No
                  </button>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={handleFinishOrder}
                  >
                    Yes
                  </button>
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

export default Orders;