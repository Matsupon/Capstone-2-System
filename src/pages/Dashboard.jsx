import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
// Header and Sidebar are now provided by the persistent layout in App.js
import api from '../api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [orderStats, setOrderStats] = useState({ pending_orders: 0, finished_orders: 0 });
  const [queueData, setQueueData] = useState({ has_queue: false, current_customer: null, next_customer: null, message: '' });
  const [todaysAppointmentsCount, setTodaysAppointmentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unviewedNewAppointments, setUnviewedNewAppointments] = useState(0);
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
        
        let response;
        try {
          console.log('Trying admin endpoint...');
          response = await api.get('/admin/appointments');
          console.log('Admin endpoint raw response:', response);
  
          const data = response.data.data || response.data;
          console.log('Appointments array:', data);
  
          if (Array.isArray(data)) {
            data.forEach(item => console.log('Single appointment item:', item));
            setAppointments(data);
          } else {
            throw new Error('Invalid response format from admin endpoint');
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
            console.log('Original endpoint raw response:', response);
  
            const data = response.data.data || response.data;
            console.log('Appointments array:', data);
  
            if (Array.isArray(data)) {
              data.forEach(item => console.log('Single appointment item:', item));
              setAppointments(data);
            } else {
              throw new Error('Invalid response format from original endpoint');
            }
  
            setIsLoading(false);
            setError(null);
            return;
  
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

    const fetchAcceptedAppointments = async () => {
      try {
        const response = await api.get('/admin/appointments/accepted');
        if (response.data?.success) {
          setAcceptedAppointments(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch accepted appointments:', err);
      }
    };

    const fetchOrderStats = async () => {
      try {
        const response = await api.get('/orders/stats');
        if (response.data?.success) {
          setOrderStats(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch order stats:', err);
      }
    };

    const fetchTodayQueue = async () => {
      try {
        const response = await api.get('/orders/today-queue');
        console.log('Today queue response:', response.data);
        if (response.data?.success) {
          const data = response.data.data;
          const allOrders = data?.all_orders || [];
          
          // Backend already filters to only Pending, Ready to Check, and Completed orders
          // with today's appointments, so we can use the data directly
          // But we'll do a safety filter just in case
          const allowedStatuses = ['Pending', 'Ready to Check', 'Completed'];
          const filteredOrders = allOrders.filter(order => {
            const status = order.status;
            return status && allowedStatuses.includes(status);
          });
          
          // Filter current_customer and next_customer if they have invalid status
          let currentCustomer = data.current_customer;
          let nextCustomer = data.next_customer;
          
          if (currentCustomer && !allowedStatuses.includes(currentCustomer.status)) {
            currentCustomer = null;
          }
          if (nextCustomer && !allowedStatuses.includes(nextCustomer.status)) {
            nextCustomer = null;
          }
          
          // Update queueData with filtered data
          setQueueData({
            ...data,
            all_orders: filteredOrders,
            current_customer: currentCustomer,
            next_customer: nextCustomer,
            has_queue: filteredOrders.length > 0
          });
          
          // Count matches the filtered orders count (should match backend count)
          setTodaysAppointmentsCount(filteredOrders.length);
          
          console.log('Queue data updated:', {
            filteredCount: filteredOrders.length,
            hasQueue: filteredOrders.length > 0,
            currentCustomer: currentCustomer?.name,
            nextCustomer: nextCustomer?.name
          });
        }
      } catch (err) {
        console.error('Failed to fetch today\'s queue:', err);
        // Set default empty state on error
        setQueueData({ 
          has_queue: false, 
          current_customer: null, 
          next_customer: null, 
          message: 'Failed to load queue data',
          all_orders: []
        });
        setTodaysAppointmentsCount(0);
      }
    };

    const fetchUnviewedAppointmentsCount = async () => {
      try {
        const res = await api.get('/notifications/appointments/unviewed-count');
        if (res.data?.success) {
          setUnviewedNewAppointments(res.data.data?.unviewed_count || 0);
        }
      } catch (_) {}
    };

    const fetchAppointmentViewStates = async () => {
      try {
        const res = await api.get('/notifications/appointments/view-states');
        if (res.data?.success) {
          const items = res.data.data || [];
          const unviewed = new Set(items.filter(i => !i.is_viewed).map(i => i.appointment_id));
          setUnviewedAppointmentIds(unviewed);
        }
      } catch (_) {}
    };

    // Initial data fetch
    const fetchAllData = async () => {
      await Promise.all([
        fetchAppointments(),
        fetchAcceptedAppointments(),
        fetchOrderStats(),
        fetchTodayQueue(),
        fetchUnviewedAppointmentsCount(),
        fetchAppointmentViewStates()
      ]);
    };

    fetchAllData();

    // Set up real-time updates every 10 seconds for better responsiveness
    const interval = setInterval(() => {
      fetchTodayQueue();
      fetchOrderStats();
      fetchUnviewedAppointmentsCount();
      fetchAppointmentViewStates();
    }, 10000);

    return () => clearInterval(interval);
  }, [navigate]);
  

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = currentDate.getDate();
  
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const todayDate = currentDate.getDate();
  const isCurrentMonth = calendarMonth === currentMonth && calendarYear === currentYear;

  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[calendarMonth];

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();

  const getMarkedDates = () => {
    const markedDates = [];
    
    if (isCurrentMonth) {
      markedDates.push(todayDate);
    }
    
    acceptedAppointments.forEach(appointment => {
      if (appointment.preferred_due_date && appointment.preferred_due_date !== 'N/A') {
        const dueDate = new Date(appointment.preferred_due_date);
        if (dueDate.getMonth() === calendarMonth && dueDate.getFullYear() === calendarYear) {
          const day = dueDate.getDate();
          if (!markedDates.includes(day)) {
            markedDates.push(day);
          }
        }
      }
    });
    
    return markedDates;
  };
  
  const markedDates = getMarkedDates();

  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
    ...Array((7 - (firstDayOfMonth + daysInMonth) % 7) % 7).fill(null)
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    const [hours, minutes] = timeString.split(':');
    const hourInt = parseInt(hours, 10);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    const formattedHour = hourInt % 12 || 12;
    
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Helper: check if a date string refers to "today"
  const isSameDayAsToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  // Helper to determine if a date (YYYY-MM-DD) is today and its time (HH:mm or HH:mm:ss) is still upcoming
  const isUpcomingToday = (dateString, timeString) => {
    if (!timeString) return false;
    // If date is provided and it's not today, return false. If no date provided, assume today (queue API already filters for today).
    if (dateString && !isSameDayAsToday(dateString)) return false;
    const [h, m] = timeString.split(':');
    const now = new Date();
    const t = new Date();
    t.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return t.getTime() >= now.getTime();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = formatTime(timeString);
    
    return `${month} ${day} - ${time}`;
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

  const getAppointmentsForDate = (day) => {
    if (!day) return [];
    
    return acceptedAppointments.filter(appointment => {
      if (!appointment.preferred_due_date) return false;
      const dueDate = new Date(appointment.preferred_due_date);
      return dueDate.getDate() === day && 
             dueDate.getMonth() === calendarMonth && 
             dueDate.getFullYear() === calendarYear;
    });
  };

  const handleDateMouseEnter = (day, event) => {
    const appointments = getAppointmentsForDate(day);
    if (appointments.length > 0) {
      setHoveredDate({ day, appointments });
      const rect = event.target.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  };

  const handleDateMouseLeave = () => {
    setHoveredDate(null);
  };

  const quickStats = [
    { title: "Today's Queued Appointments", value: todaysAppointmentsCount, color: "blue" },
    { title: "Pending Orders", value: orderStats.pending_orders, color: "yellow" },
    { title: "Completed Orders", value: orderStats.finished_orders, color: "green" }
  ];

  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [openedFromDueDates, setOpenedFromDueDates] = useState(false);
  const [detailsClosing, setDetailsClosing] = useState(false);
  const [queueClosing, setQueueClosing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  useEffect(() => {
    const loadOrderForDetails = async () => {
      if (!showDetails || !selectedAppointment) {
        setSelectedOrder(null);
        return;
      }
      try {
        const res = await api.get('/orders');
        const list = res.data?.data || [];
        const match = list.find(o => {
          if (!o) return false;
          // Direct id matches (order clicked scenarios)
          if (o.id && selectedAppointment.id && o.id === selectedAppointment.id) return true;
          // Appointment id matches (common case)
          if (o.appointment?.id && selectedAppointment.id && o.appointment.id === selectedAppointment.id) return true;
          // Match by user and exact date/time if available
          const ou = o.appointment?.user?.id;
          const su = selectedAppointment.user?.id || selectedAppointment.appointment?.user?.id;
          const od = o.appointment?.appointment_date || o.appointment?.preferred_due_date;
          const sd = selectedAppointment.appointment_date || selectedAppointment.preferred_due_date || selectedAppointment.appointment?.appointment_date || selectedAppointment.appointment?.preferred_due_date;
          const ot = o.appointment?.appointment_time;
          const st = selectedAppointment.appointment_time || selectedAppointment.appointment?.appointment_time;
          if (ou && su && ou === su && od && sd && od === sd) {
            if (!ot || !st || ot === st) return true;
          }
          return false;
        });
        setSelectedOrder(match || null);
      } catch (_) {
        setSelectedOrder(null);
      }
    };
    loadOrderForDetails();
  }, [showDetails, selectedAppointment]);

  return (
      <div className="dashboard-content">
          <div className="left-panel">
            {/* Quick Stats */}
            <div className="panel quick-stats">
              <h3>Quick Stats</h3>
              <div className="stats-grid">
                {quickStats.map((stat, index) => (
                  <div key={index} className={`stat-card ${stat.color}`}>
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-title">{stat.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Appointments */}
            <div className="panel recent-appointments">
              <div className="panel-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  New Appointments
                  {unviewedNewAppointments > 0 && (
                    <span style={{
                      background: '#e11d48',
                      color: 'white',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: 12,
                      lineHeight: 1,
                      marginLeft: 8
                    }}>{unviewedNewAppointments}</span>
                  )}
                </h3>
                <Link to="/appointments" className="view-all-link">View All</Link>
              </div>
              <div className="table-container">
                {isLoading ? (
                  <p>Loading appointments...</p>
                ) : error ? (
                  <p>Error: {error}</p>
                ) : appointments.length === 0 ? (
                  <p>No appointments found.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Name</th>
                        <th>Service</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 3).map((appointment, index) => (
                        <tr
                          key={index}
                          style={unviewedAppointmentIds.has(appointment.id) ? { background: '#e6f0ff' } : {}}
                        >
                          <td>{formatDateTime(appointment.appointment_date, appointment.appointment_time)}</td>
                          <td>{appointment.user?.name || 'N/A'}</td>
                          <td>{appointment.service_type}</td>
                          <td>
                            <span
                              className="action-link"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setOpenedFromDueDates(false);
                                setShowDetails(true);
                                api.patch(`/notifications/appointments/${appointment.id}/viewed`).then(() => {
                                  setUnviewedNewAppointments((c) => Math.max(0, c - 1));
                                  setUnviewedAppointmentIds(prev => {
                                    if (!prev.has(appointment.id)) return prev;
                                    const next = new Set(prev);
                                    next.delete(appointment.id);
                                    return next;
                                  });
                                }).catch(() => {});
                              }}
                            >
                              View Details
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Live Queue */}
            <div className="panel live-queue">
              <div className="panel-header">
                <h3>Live Queue - Today</h3>
                <button
                  type="button"
                  className="view-all-link"
                  onClick={() => setShowQueueModal(true)}
                  disabled={!queueData?.has_queue || !(queueData?.all_orders || []).length}
                >
                  View All
                </button>
              </div>
              <div className="queue-info">
                {queueData.has_queue ? (
                  <>
                    {/* Current Customer */}
                    {queueData.current_customer && isUpcomingToday(
                      queueData.current_customer?.appointment_date,
                      queueData.current_customer?.appointment_time
                    ) && (
                      <div className="current-customer">
                        <strong>Upcoming Customer:</strong>{' '}
                        <span className="queue-number">
                          #{queueData.current_customer?.queue_number || 'N/A'}
                        </span>{' '}
                        {queueData.current_customer?.name || 'N/A'}
                        <span className="queue-time">
                          ({formatTime(queueData.current_customer?.appointment_time)})
                        </span>
                        {queueData.current_customer?.status && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: getStatusColor(queueData.current_customer.status) }}>
                            [{queueData.current_customer.status}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* Next Customer */}
                    {queueData.next_customer && isUpcomingToday(
                      queueData.next_customer?.appointment_date,
                      queueData.next_customer?.appointment_time
                    ) && (
                      <div className="next-customer">
                        <strong>Next Customer:</strong>{' '}
                        <span className="queue-number">
                          #{queueData.next_customer?.queue_number || 'N/A'}
                        </span>{' '}
                        {queueData.next_customer?.name || 'N/A'}
                        <span className="queue-time">
                          ({formatTime(queueData.next_customer?.appointment_time)})
                        </span>
                        {queueData.next_customer?.status && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: getStatusColor(queueData.next_customer.status) }}>
                            [{queueData.next_customer.status}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* If neither upcoming, show message */}
                    {!(queueData.current_customer && isUpcomingToday(
                      queueData.current_customer?.appointment_date,
                      queueData.current_customer?.appointment_time
                    )) &&
                     !(queueData.next_customer && isUpcomingToday(
                      queueData.next_customer?.appointment_date,
                      queueData.next_customer?.appointment_time
                    )) && (
                      <div className="no-queue-message">
                        <div className="queue-status">
                          <span className="status-indicator inactive"></span>
                          <span>{queueData.message || 'No queued customers at the moment'}</span>
                        </div>
                      </div>
                    )}

                  </>
                ) : (
                  <div className="no-queue-message">
                    <div className="queue-status">
                      <span className="status-indicator inactive"></span>
                      <span>{queueData.message || 'No appointments scheduled for today'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                  <h2 className="dashboard-modal-title">{openedFromDueDates ? 'Order Details' : 'Appointment Details'}</h2>
                  <div className="dashboard-details-container" style={{ flexWrap: 'wrap' }}>
                    <div className="dashboard-details-left">
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Full Name</div>
                        <div className="dashboard-detail-value">{selectedAppointment.appointment?.user?.name || selectedAppointment.user?.name || 'N/A'}</div>
                      </div>
                      {openedFromDueDates && (
                        <div className="dashboard-detail-group">
                          <div className="dashboard-detail-label">Queue Number</div>
                          <div className="dashboard-detail-value">
                            {selectedOrder?.queue_number ?? selectedAppointment.queue_number ?? selectedAppointment.appointment?.queue_number ?? 'N/A'}
                          </div>
                        </div>
                      )}
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Appointment Date Accepted</div>
                        <div className="dashboard-detail-value">{(selectedAppointment.appointment?.appointment_date || selectedAppointment.appointment_date) ? new Date(selectedAppointment.appointment?.appointment_date || selectedAppointment.appointment_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Service Type</div>
                        <div className="dashboard-detail-value">{selectedAppointment.appointment?.service_type || selectedAppointment.service_type || 'N/A'}</div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Phone Number</div>
                        <div className="dashboard-detail-value">{selectedAppointment.appointment?.user?.phone || selectedAppointment.appointment?.user?.phone_number || selectedAppointment.user?.phone || selectedAppointment.user?.phone_number || 'N/A'}</div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Size</div>
                        <div className="dashboard-detail-value">
                          {(() => {
                            const rawSizes = selectedAppointment.appointment?.sizes ?? selectedAppointment.sizes;
                            if (!rawSizes) return 'N/A';
                            try {
                              const parsed = typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes;
                              if (parsed && typeof parsed === 'object') {
                                return (
                                  <>
                                    {Object.entries(parsed).map(([size, qty]) => (
                                      <div key={size}>{size} - {qty} pcs.</div>
                                    ))}
                                  </>
                                );
                              }
                              return String(rawSizes);
                            } catch (_) {
                              return String(rawSizes);
                            }
                          })()}
                        </div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Quantity</div>
                        <div className="dashboard-detail-value">{(selectedAppointment.appointment?.total_quantity ?? selectedAppointment.total_quantity) ? `${selectedAppointment.appointment?.total_quantity ?? selectedAppointment.total_quantity} pcs.` : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="dashboard-details-right">
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Due Date</div>
                        <div className="dashboard-detail-value">{(selectedAppointment.appointment?.preferred_due_date || selectedAppointment.preferred_due_date) ? new Date(selectedAppointment.appointment?.preferred_due_date || selectedAppointment.preferred_due_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      {((selectedAppointment.status === 'Completed' || selectedAppointment.appointment?.status === 'Completed') && (selectedAppointment.total_amount || selectedAppointment.appointment?.total_amount)) && (
                        <div className="dashboard-detail-group">
                          <div className="dashboard-detail-label">Total Payment Fee</div>
                          <div className="dashboard-detail-value">₱{selectedAppointment.total_amount ?? selectedAppointment.appointment?.total_amount}</div>
                        </div>
                      )}
                      {((selectedAppointment.status === 'Completed' || selectedAppointment.appointment?.status === 'Completed') && (selectedAppointment.completed_at || selectedAppointment.appointment?.completed_at)) && (
                        <div className="dashboard-detail-group">
                          <div className="dashboard-detail-label">Completion Date</div>
                          <div className="dashboard-detail-value">{new Date(selectedAppointment.completed_at || selectedAppointment.appointment?.completed_at).toLocaleString()}</div>
                        </div>
                      )}
                      {openedFromDueDates && (
                        <div className="dashboard-detail-group">
                          <div className="dashboard-detail-label">Current Status</div>
                          <div className="dashboard-detail-value" style={{ color: getStatusColor(selectedOrder?.status || selectedAppointment.status || selectedAppointment.appointment?.status) }}>
                            {selectedOrder?.status || selectedAppointment.status || selectedAppointment.appointment?.status || 'N/A'}
                          </div>
                        </div>
                      )}
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Notes</div>
                        <div className="dashboard-detail-value">{selectedAppointment.appointment?.notes || selectedAppointment.notes || 'No notes provided.'}</div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-image-label">Design Image</div>
                        {selectedAppointment.appointment?.design_image || selectedAppointment.design_image ? (
                          <img 
                            src={selectedAppointment.appointment?.design_image || selectedAppointment.design_image} 
                            alt="Design" 
                            className="dashboard-modal-image"
                            onClick={() => setPreviewImageUrl(selectedAppointment.appointment?.design_image || selectedAppointment.design_image)}
                          />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center', marginTop: 8 }}>
                            No design image uploaded
                          </div>
                        )}
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-image-label">GCash Proof</div>
                        {selectedAppointment.appointment?.gcash_proof || selectedAppointment.gcash_proof ? (
                          <img 
                            src={selectedAppointment.appointment?.gcash_proof || selectedAppointment.gcash_proof} 
                            alt="GCash Payment" 
                            className="dashboard-modal-image"
                            onClick={() => setPreviewImageUrl(selectedAppointment.appointment?.gcash_proof || selectedAppointment.gcash_proof)}
                          />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center', marginTop: 8 }}>
                            No GCash proof uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview Modal */}
            {previewImageUrl && (
              <div
                className="dashboard-modal-bg animate-fade"
                onClick={() => setPreviewImageUrl(null)}
              >
                <div
                  className="dashboard-modal-panel animate-pop"
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: 12 }}
                >
                  <AiOutlineClose
                    className="dashboard-modal-exit-icon"
                    onClick={() => setPreviewImageUrl(null)}
                  />
                  <img
                    src={previewImageUrl}
                    alt="Preview"
                    style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'auto', height: 'auto', borderRadius: 6 }}
                  />
                </div>
              </div>
            )}

            {/* Live Queue - Full List Modal */}
            {showQueueModal && (
              <div
                className={`dashboard-modal-bg animate-fade${queueClosing ? ' closing' : ''}`}
                onClick={() => {
                  setQueueClosing(true);
                  setTimeout(() => {
                    setShowQueueModal(false);
                    setQueueClosing(false);
                  }, 200);
                }}
              >
                <div
                  className={`dashboard-modal-panel animate-pop${queueClosing ? ' closing' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AiOutlineClose
                    className="dashboard-modal-exit-icon"
                    onClick={() => {
                      setQueueClosing(true);
                      setTimeout(() => {
                        setShowQueueModal(false);
                        setQueueClosing(false);
                      }, 200);
                    }}
                  />
                  <h2 className="dashboard-modal-title">Today's Queue</h2>
                  <div className="table-container" style={{ overflowY: 'auto' }}>
                    {!(queueData?.all_orders || []).length ? (
                      <p style={{ padding: '8px 4px', color: '#687076' }}>{queueData?.message || 'No queued customers for today.'}</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#e8f4fd' }}>
                            <th style={{ textAlign: 'center', padding: '8px', width: '15%' }}>Queue #</th>
                            <th style={{ textAlign: 'center', padding: '8px', width: '20%' }}>Name</th>
                            <th style={{ textAlign: 'center', padding: '8px', width: '15%' }}>Time</th>
                            <th style={{ textAlign: 'center', padding: '8px', width: '30%' }}>Service</th>
                            <th style={{ textAlign: 'center', padding: '8px', width: '20%' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(queueData.all_orders || [])
                            .filter(o => isUpcomingToday(
                              o.appointment_date,
                              o.appointment_time
                            ))
                            .slice()
                            .sort((a, b) => (a.queue_number || 0) - (b.queue_number || 0))
                            .map((o, i) => (
                              <tr key={o.id || i}>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{o.queue_number ?? 'N/A'}</td>
                                <td style={{ padding: '8px' }}>{o.name || 'N/A'}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{formatTime(o.appointment_time)}</td>
                                <td style={{ padding: '8px' }}>{o.service_type || 'N/A'}</td>
                                <td style={{ padding: '8px', textAlign: 'center', color: getStatusColor(o.status), fontWeight: 600 }}>
                                  {o.status || 'N/A'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="right-panel">
            {/* Calendar */}
            <div className="panel calendar-section">
              <div className="calendar-header">
                <h3>{currentMonthName} {calendarYear}</h3>
                <div className="calendar-nav">
                  <button className="nav-btn" onClick={handlePrevMonth}><FaChevronLeft /></button>
                  <button className="nav-btn" onClick={handleNextMonth}><FaChevronRight /></button>
                </div>
              </div>
              <div className="calendar-grid">
                <div className="calendar-days">
                  <span>SUN</span>
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                </div>
                <div className="calendar-dates">
                  {calendarDays.map((day, index) => {
                    let isToday = isCurrentMonth && day === todayDate;
                    let isPast = false;
                    if (day && (calendarYear < currentYear || (calendarYear === currentYear && (calendarMonth < currentMonth || (calendarMonth === currentMonth && day < todayDate))))) {
                      isPast = true;
                    }
                    const hasAppointments = day && getAppointmentsForDate(day).length > 0;
                    return (
                      <div 
                        key={index} 
                        className={`calendar-date ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${hasAppointments ? 'has-appointments' : ''}`}
                        onMouseEnter={(e) => handleDateMouseEnter(day, e)}
                        onMouseLeave={handleDateMouseLeave}
                      >
                        {day && (
                          <>
                            <span className="date-number">{day}</span>
                            {markedDates.includes(day) && <span className="red-dot"></span>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Calendar Tooltip */}
            {hoveredDate && (
              <div 
                className="calendar-tooltip"
                style={{
                  position: 'fixed',
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  transform: 'translateX(-50%)',
                  zIndex: 1000
                }}
              >
                <div className="tooltip-content">
                  <div className="tooltip-header">
                    {monthNames[calendarMonth]} {hoveredDate.day}
                  </div>
                  {hoveredDate.appointments.map((appointment, index) => (
                    <div key={index} className="tooltip-item">
                      <div className="tooltip-customer">{appointment.user?.name || 'N/A'}</div>
                      <div className="tooltip-service">{appointment.service_type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Due Dates */}
            <div className="panel upcoming-dates-section">
              <div className="panel-header">
                <h3>Upcoming Due Dates</h3>
                <Link to="/orders" className="view-all-link">View All</Link>
              </div>
              <div className="due-dates-list">
                {acceptedAppointments
                  .filter(app => {
                    if (!app.preferred_due_date) return false;
                    const due = new Date(app.preferred_due_date);
                    const now = new Date();
                    // Only show items for current month and next month
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();
                    const dueMonth = due.getMonth();
                    const dueYear = due.getFullYear();
                    
                    // Include current month and next month only
                    const isCurrentMonth = dueMonth === currentMonth && dueYear === currentYear;
                    const isNextMonth = dueMonth === (currentMonth + 1) % 12 && dueYear === (currentMonth === 11 ? currentYear + 1 : currentYear);
                    
                    return isCurrentMonth || isNextMonth;
                  })
                  .sort((a, b) => new Date(a.preferred_due_date) - new Date(b.preferred_due_date))
                  .slice(0, 2)
                  .map((appointment, index) => (
                    <div
                      key={index}
                      className="due-date-item"
                      onClick={() => { setSelectedAppointment(appointment); setOpenedFromDueDates(true); setShowDetails(true); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="avatar">
                        <FaUser />
                      </div>
                      <div className="due-date-info">
                        <div className="customer-name">{appointment.user?.name || 'N/A'}</div>
                        <div className="service">{appointment.service_type}</div>
                        <div className="date-time">{appointment.preferred_due_date ? formatDate(appointment.preferred_due_date) : 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                {acceptedAppointments.filter(app => {
                  if (!app.preferred_due_date) return false;
                  const due = new Date(app.preferred_due_date);
                  const now = new Date();
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();
                  const dueMonth = due.getMonth();
                  const dueYear = due.getFullYear();
                  
                  const isCurrentMonth = dueMonth === currentMonth && dueYear === currentYear;
                  const isNextMonth = dueMonth === (currentMonth + 1) % 12 && dueYear === (currentMonth === 11 ? currentYear + 1 : currentYear);
                  
                  return isCurrentMonth || isNextMonth;
                }).length === 0 && (
                  <p style={{ color: '#687076', padding: '8px 4px' }}>No upcoming due dates.</p>
                )}
              </div>
            </div>
          </div>
      </div>
  );
};

export default Dashboard;