import React, { useState, useEffect } from 'react';
import '../styles/Orders.css';
import { FaTimes, FaChevronLeft, FaChevronRight, FaFilter, FaSearch } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';

const formatTimeToAMPM = (timeString) => {
  if (!timeString) return '';

  console.log('formatTimeToAMPM input:', timeString);
  
  try {
    // Handle different time formats
    let timeObj;
    if (timeString.includes('T')) {
      // ISO format with T
      timeObj = new Date(timeString);
    } else if (timeString.includes(' ')) {
      // Date and time separated by space
      timeObj = new Date(timeString);
    } else {
      // Just time string (HH:MM)
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid time format:', timeString);
        return '';
      }
      timeObj = new Date();
      timeObj.setHours(hours, minutes, 0, 0);
    }

    if (isNaN(timeObj.getTime())) {
      console.warn('Invalid time object created from:', timeString);
      return '';
    }

    const result = timeObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    console.log('formatTimeToAMPM result:', result);
    
    return result;
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return '';
  }
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);
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
  const [filterOption, setFilterOption] = useState('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
          check_appointment_time: order.check_appointment_time,
          pickup_appointment_date: order.pickup_appointment_date,
          pickup_appointment_time: order.pickup_appointment_time,
          appointment_date: order.appointment?.appointment_date,
          appointment_time: order.appointment?.appointment_time,
          preferred_due_date: order.appointment?.preferred_due_date
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUpdateDropdown && !event.target.closest('.update-dropdown') && !event.target.closest('.update-btn')) {
        setShowUpdateDropdown(null);
      }
      if (showFilterDropdown && !event.target.closest('.filter-dropdown') && !event.target.closest('button')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUpdateDropdown, showFilterDropdown]);

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
        return '#2196f3';
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
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return '';
      }
      
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      
      // If the original string contains time information (T or space with colon), include it
      if (dateString.includes('T') || (dateString.includes(' ') && dateString.includes(':'))) {
        const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        console.log('Final formatted string with time:', `${month} ${day} - ${time}`);
        return `${month} ${day} - ${time}`;
      } else {
        // For date-only strings, just show the date
        console.log('Final formatted string (date only):', `${month} ${day}`);
        return `${month} ${day}`;
      }
    } catch (error) {
      console.warn('Error parsing date string:', dateString, error);
      return '';
    }
  };

  const formatDateAndTime = (dateString, timeString) => {
    if (!dateString) return '';
    
    try {
      let dateTime;
      let time;
      
      // Check if timeString is a simple time format (HH:MM) or a full datetime
      if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
        // timeString is a simple time format (e.g., "08:00")
        const date = new Date(dateString);
        const [hours, minutes] = timeString.split(':').map(Number);
        
        // Create a new date with the correct time
        dateTime = new Date(date);
        dateTime.setHours(hours, minutes, 0, 0);
        
        // Format time manually to avoid timezone issues
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 === 0 ? 12 : hours % 12;
        time = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
      } else if (dateString.includes('T') && timeString.includes('T')) {
        // Both are full datetime strings, use the timeString as it likely has the correct time
        const localTimeString = timeString.replace('Z', '').replace(/\.\d+/, '');
        dateTime = new Date(localTimeString);
        time = dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (dateString.includes('T')) {
        // dateString is already a full datetime, use it
        const localDateString = dateString.replace('Z', '').replace(/\.\d+/, '');
        dateTime = new Date(localDateString);
        time = dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (timeString.includes('T')) {
        // timeString is a full datetime, use it
        const localTimeString = timeString.replace('Z', '').replace(/\.\d+/, '');
        dateTime = new Date(localTimeString);
        time = dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      } else {
        // Both are separate date and time strings, combine them
        const isoString = `${dateString}T${timeString}`;
        dateTime = new Date(isoString);
        time = dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      
      if (isNaN(dateTime.getTime())) {
        console.warn('Invalid datetime:', { dateString, timeString });
        return '';
      }
      
      const month = monthNames[dateTime.getMonth()];
      const day = dateTime.getDate();
      
      console.log('formatDateAndTime result:', `${month} ${day} - ${time}`);
      console.log('Original strings:', { dateString, timeString });
      console.log('Parsed date object:', dateTime);
      return `${month} ${day} - ${time}`;
    } catch (error) {
      console.warn('Error formatting date and time:', dateString, timeString, error);
      return '';
    }
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
        
        // Check if the selected date is in the past
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          console.log("Selected date is in the past, clearing booked times");
          setBookedCheckTimes([]);
          return;
        }
        
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
        
        // Check if the selected date is in the past
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          console.log("Selected completion date is in the past, clearing booked times");
          setBookedPickupTimes([]);
          return;
        }
        
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
        // Exclude lunch time (12:00 and 12:30)
        if (time !== '12:00' && time !== '12:30') {
          slots.push(time);
        }
      }
    }
    return slots;
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-title">
          <h1>ORDERS</h1>
        </div>
        <div className="orders-content">
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="page-title">
          <h1>ORDERS</h1>
        </div>
        <div className="orders-content">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  // Helper function to get filter display name
  const getFilterDisplayName = (filter) => {
    switch(filter) {
      case 'none':
        return 'No Filter';
      case 'deadline-nearest':
        return 'Nearest Deadline';
      case 'oldest-newest':
        return 'Oldest to Newest';
      case 'newest-oldest':
        return 'Newest to Oldest';
      case 'status-pending':
        return 'Status: Pending';
      case 'status-ready':
        return 'Status: Ready to Check';
      case 'status-completed':
        return 'Status: Completed';
      default:
        return 'No Filter';
    }
  };

  // Filter and sort orders based on selected filter and search query
  const getFilteredOrders = () => {
    let filteredOrders = [...orders];
    
    // Apply search filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        const name = order.appointment?.user?.name?.toLowerCase() || '';
        const service = order.appointment?.service_type?.toLowerCase() || '';
        return name.includes(query) || service.includes(query);
      });
    }
    
    switch(filterOption) {
      case 'deadline-nearest':
        // Sort by nearest deadline (preferred_due_date)
        filteredOrders.sort((a, b) => {
          const dateA = a.appointment?.preferred_due_date ? new Date(a.appointment.preferred_due_date) : new Date('9999-12-31');
          const dateB = b.appointment?.preferred_due_date ? new Date(b.appointment.preferred_due_date) : new Date('9999-12-31');
          return dateA - dateB;
        });
        break;
      case 'oldest-newest':
        // Sort by order creation date (oldest first)
        filteredOrders.sort((a, b) => a.id - b.id);
        break;
      case 'newest-oldest':
        // Sort by order creation date (newest first)
        filteredOrders.sort((a, b) => b.id - a.id);
        break;
      case 'status-pending':
        filteredOrders = filteredOrders.filter(order => order.status === 'Pending');
        break;
      case 'status-ready':
        filteredOrders = filteredOrders.filter(order => order.status === 'Ready to Check');
        break;
      case 'status-completed':
        filteredOrders = filteredOrders.filter(order => order.status === 'Completed');
        break;
      default:
        // No filter applied
        break;
    }
    
    return filteredOrders;
  };

  return (
    <div className="page-wrap">
      <div className="page-title">
        <h1>ORDERS</h1>
      </div>
      <div className="orders-content">
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 24, margin: '0 16px', overflow: 'visible' }}>
            {/* Search and Filter Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: 14
                }} />
                <input
                  type="text"
                  placeholder="Search orders by name or service"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 16px 8px 36px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              {/* Current Filter Display and Filter Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Display current filter */}
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: filterOption === 'none' ? '#6b7280' : '#2563eb',
                  padding: '6px 12px',
                  background: filterOption === 'none' ? '#f3f4f6' : '#dbeafe',
                  borderRadius: 6,
                  border: filterOption === 'none' ? '1px solid #e5e7eb' : '1px solid #93c5fd',
                  transition: 'all 0.2s'
                }}>
                  {getFilterDisplayName(filterOption)}
                </div>
                
                <div style={{ position: 'relative' }}>
                  <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                    <FaFilter /> Filter Orders
                  </button>
                </div>
              </div>
              {showFilterDropdown && (
                <div className="filter-dropdown" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: 220
                }}>
                  <div style={{ padding: '8px 0' }}>
                    <div 
                      onClick={() => { setFilterOption('none'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'none' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'none' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'none' ? '#f3f4f6' : 'white'}
                    >
                      🔹 No Filter
                    </div>
                    <div 
                      onClick={() => { setFilterOption('deadline-nearest'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'deadline-nearest' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'deadline-nearest' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'deadline-nearest' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Nearest Deadline
                    </div>
                    <div 
                      onClick={() => { setFilterOption('oldest-newest'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'oldest-newest' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'oldest-newest' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'oldest-newest' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Oldest to Newest
                    </div>
                    <div 
                      onClick={() => { setFilterOption('newest-oldest'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'newest-oldest' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'newest-oldest' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'newest-oldest' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Newest to Oldest
                    </div>
                    <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }}></div>
                    <div 
                      onClick={() => { setFilterOption('status-pending'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'status-pending' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'status-pending' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'status-pending' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Status: Pending
                    </div>
                    <div 
                      onClick={() => { setFilterOption('status-ready'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'status-ready' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'status-ready' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'status-ready' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Status: Ready to Check
                    </div>
                    <div 
                      onClick={() => { setFilterOption('status-completed'); setShowFilterDropdown(false); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: filterOption === 'status-completed' ? '#f3f4f6' : 'white',
                        fontWeight: filterOption === 'status-completed' ? 600 : 400
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = filterOption === 'status-completed' ? '#f3f4f6' : 'white'}
                    >
                      🔹 Status: Completed
                    </div>
                  </div>
                </div>
              )}
            </div>
            {orders.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px 0' }}>No orders found.</p>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', overflow: 'visible' }}>
              <thead>
                <tr style={{ background: '#e8f4fd' }}>
                 <th style={{ width: '5%' }}>Queue #</th>
                 <th style={{ width: '15%' }}>Name</th>
                 <th style={{ width: '18%' }}>Services</th>
                 <th style={{ width: '15%' }}>Deadline</th>
                 <th style={{ width: '15%' }}>Status</th>
                 <th style={{ width: '17%' }}>Next Appoint.</th>
                 <th style={{ width: '10%' }}>Layout/Notes</th>
                 <th style={{ width: '10%' }}>Actions</th>
               </tr>
              </thead>
              <tbody>
                {getFilteredOrders().slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td>{order.queue_number}</td>
                    <td>{order.appointment?.user?.name || 'N/A'}</td>
                    <td>{order.appointment?.service_type || 'N/A'}</td>
                    <td>
                      {order.appointment?.preferred_due_date ? (
                        <span>{new Date(order.appointment.preferred_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      ) : (
                        <span style={{ color: '#999' }}>N/A</span>
                      )}
                    </td>
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
                      {order.status === 'Ready to Check' && (!order.check_appointment_date || !order.check_appointment_time) && (
                        <span style={{ color: '#999' }}>No appointment set</span>
                      )}
                      {order.status === 'Pending' && (
                        order.appointment?.appointment_date && order.appointment?.appointment_time ? (
                          <span>{formatDateAndTime(order.appointment.appointment_date, order.appointment.appointment_time)}</span>
                        ) : order.appointment?.preferred_due_date ? (
                          <span>{formatDateForDisplay(order.appointment.preferred_due_date)}</span>
                        ) : (
                          <span style={{ color: '#999' }}>No appointment set</span>
                        )
                      )}
                      {order.status === 'Completed' && order.pickup_appointment_date && order.pickup_appointment_time && (
                        <span>{formatDateAndTime(order.pickup_appointment_date, order.pickup_appointment_time)}</span>
                      )}
                      {order.status === 'Completed' && (!order.pickup_appointment_date || !order.pickup_appointment_time) && (
                        <span style={{ color: '#999' }}>No pickup set</span>
                      )}
                      {order.status === 'Finished' && (
                        <span>N/A</span>
                      )}
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
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button
                          className="update-btn"
                          onClick={() => toggleUpdateDropdown(order.id)}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          Update
                        </button>
                        {showUpdateDropdown === order.id && (
                          <div className="update-dropdown">
                            <div
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Pending')}
                            >
                              Pending
                            </div>
                            <div
                              className="dropdown-item"
                              onClick={() => handleUpdateStatus(order.id, 'Ready to Check')}
                            >
                              Ready to check
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
            )}
          </div>

          {/* View File Modal (Dashboard design) */}
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
                      <div className="detail-label" style={{ fontWeight: 600 }}>Order Number</div>
                      <div className="detail-value" style={{ fontWeight: 400 }}>#{selectedOrder.id}</div>
                    </div>
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
                    {selectedOrder.status === 'Completed' && selectedOrder.total_amount && (
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
                    {selectedOrder.status === 'Completed' && selectedOrder.completed_at && (
                      <div className="detail-group" style={{ marginBottom: 8 }}>
                        <div className="detail-label" style={{ fontWeight: 600 }}>Completion Date</div>
                        <div className="detail-value" style={{ fontWeight: 400 }}>{formatDateForDisplay(selectedOrder.completed_at)}</div>
                      </div>
                    )}
                    <div className="detail-group" style={{ marginBottom: 8 }}>
                      <div className="detail-label" style={{ fontWeight: 600 }}>Current Status</div>
                      <div className="detail-value" style={{ color: getStatusColor(selectedOrder.status), fontWeight: 400 }}>
                        {selectedOrder.status}
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
            <div className="dashboard-modal-bg animate-fade" onClick={() => setShowPaymentModal(false)}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
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
            <div className="dashboard-modal-bg animate-fade" onClick={() => { setShowFinishConfirmation(false); setOrderToFinish(null); }}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
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

export default Orders;