import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import api from '../api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
        
        let response;
        try {
          console.log('Trying admin endpoint...');
          response = await api.get('/admin/appointments');
          console.log('Admin endpoint raw response:', response);
  
          // Extract data array in one place
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
  
          // Fallback to original endpoint
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
  
    fetchAppointments();
  }, [navigate]);
  

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = currentDate.getDate();
  
  // Calendar state for dynamic navigation
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const todayDate = currentDate.getDate();
  const isCurrentMonth = calendarMonth === currentMonth && calendarYear === currentYear;

  // Get month name
  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[calendarMonth];

  // Get days in selected month
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  // Get first day of selected month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();

  // Marked dates logic (keep as before, but update for selected month)
  const getRandomDays = () => {
    const days = [];
    while (days.length < 2) {
      const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
      if ((calendarMonth !== currentMonth || randomDay !== todayDate) && !days.includes(randomDay)) {
        days.push(randomDay);
      }
    }
    return days;
  };
  const markedDates = (isCurrentMonth ? [todayDate] : []).concat(getRandomDays());

  // Calendar grid for selected month
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
    ...Array((7 - (firstDayOfMonth + daysInMonth) % 7) % 7).fill(null)
  ];

  // Calendar navigation handlers
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
    
    const date = new Date(dateString);
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  // Helper function to format date and time as "Month Day - Time" (e.g., "May 10 - 9:30 AM")
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const time = formatTime(timeString);
    
    return `${month} ${day} - ${time}`;
  };

  // Sample data
  const quickStats = [
    { title: "Today's Appointments", value: appointments.filter(app => {
        const appDate = new Date(app.appointment_date);
        return appDate.toDateString() === currentDate.toDateString();
      }).length, color: "blue" },
    { title: "Pending Orders", value: 7, color: "yellow" },
    { title: "Completed Orders", value: 3, color: "green" }

    
  ];

  const liveQueue = {
    current: { number: "001", name: "Juan Dela Cruz" },
    next: { number: "002", name: "Dianne Javellana" }
  };

  // Modal state for Recent Appointments
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        
        <div className="page-title">
          <h1>DASHBOARD</h1>
        </div>
        
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
              <h3>Recent Appointments</h3>
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
                      {appointments.map((appointment, index) => (
                        <tr key={index}>
                          <td>{formatDateTime(appointment.appointment_date, appointment.appointment_time)}</td>
                          <td>{appointment.user?.name || 'N/A'}</td>
                          <td>{appointment.service_type}</td>
                          <td>
                            <span
                              className="action-link"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowDetails(true);
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
              <h3>Live Queue</h3>
              <div className="queue-info">
                <div className="current-customer">
                  <strong>Current Customer:</strong> #{liveQueue.current.number} {liveQueue.current.name}
                </div>
                <div className="next-customer">
                  <strong>Next Customer:</strong> #{liveQueue.next.number} {liveQueue.next.name}
                </div>
              </div>
            </div>

            {/* Modal for Appointment Details */}
            {showDetails && selectedAppointment && (
              <div className="dashboard-modal-bg">
                <div className="dashboard-modal-panel" style={{ position: 'relative', maxHeight: '90vh', width: 'min(700px, 95vw)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                  <AiOutlineClose
                    className="dashboard-modal-exit-icon"
                    onClick={() => setShowDetails(false)}
                  />
                  <h2 className="dashboard-modal-title">Appointment Details</h2>
                  <div className="dashboard-details-container" style={{flexDirection: 'row', gap: '30px', flexWrap: 'wrap'}}>
                    <div className="dashboard-details-left">
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Full Name</div>
                        <div className="dashboard-detail-value">{selectedAppointment.user?.name || 'N/A'}</div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Service Type</div>
                        <div className="dashboard-detail-value">{selectedAppointment.service_type}</div>
                      </div>

                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Size</div>
                        <div className="dashboard-detail-value">
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
                      </div>

                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Quantity</div>
                        <div className="dashboard-detail-value">
                          {selectedAppointment.total_quantity ? `${selectedAppointment.total_quantity} pcs.` : 'N/A'}
                        </div>
                      </div>
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Phone Number</div>
                        <div className="dashboard-detail-value">{selectedAppointment.user?.phone || 'N/A'}</div>
                      </div>
                      
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Due Date</div>
                        <div className="dashboard-detail-value">
                          {selectedAppointment.preferred_due_date ? formatDate(selectedAppointment.preferred_due_date) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="dashboard-details-right">
                      <div className="dashboard-detail-group">
                        <div className="dashboard-detail-label">Notes</div>
                        <div className="dashboard-detail-value">{selectedAppointment.notes || 'No notes provided.'}</div>
                      </div>
                      <div className="dashboard-image-group">
                        <div className="dashboard-image-label">Design Image</div>
                        {selectedAppointment.design_image ? (
                         <img 
                         src={selectedAppointment.design_image} 
                         alt="Jersey Design"
                         className="dashboard-modal-image"
                         style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
                       />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                            No design image uploaded
                          </div>
                        )}
                      </div>
                      <div className="dashboard-image-group">
                        <div className="dashboard-image-label">Gcash Downpayment</div>
                        {selectedAppointment.gcash_proof ? (
                          <img 
                          src={selectedAppointment.gcash_proof} 
                          alt="Gcash Payment"
                          className="dashboard-modal-image"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
                        />
                        ) : (
                          <div style={{ padding: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                            No GCash proof uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="right-panel">
            <div className="panel calendar-due-container">
              {/* Calendar */}
              <div className="calendar-section">
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
                      return (
                        <div key={index} className={`calendar-date ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
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

              {/* Upcoming Due Dates */}
              <div className="upcoming-dates-section">
                <div className="panel-header">
                  <h3>Upcoming Due Dates</h3>
                  <Link to="/orders" className="view-all-link">View All</Link>
                </div>
                <div className="due-dates-list">
                  {appointments
                    .filter(app => new Date(app.preferred_due_date) > new Date())
                    .sort((a, b) => new Date(a.preferred_due_date) - new Date(b.preferred_due_date))
                    .slice(0, 2)
                    .map((appointment, index) => (
                      <div key={index} className="due-date-item">
                        <div className="avatar">
                          <FaUser />
                        </div>
                        <div className="due-date-info">
                          <div className="customer-name">{appointment.user?.name || 'N/A'}</div>
                          <div className="service">{appointment.service_type}</div>
                          <div className="date-time">
                            {appointment.preferred_due_date ? formatDate(appointment.preferred_due_date) : 'N/A'} • {formatTime(appointment.appointment_time)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;