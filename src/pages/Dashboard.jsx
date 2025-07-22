import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';

const Dashboard = () => {
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

  // Sample data
  const quickStats = [
    { title: "Today's Appointments", value: 3, color: "blue" },
    { title: "Pending Orders", value: 7, color: "yellow" },
    { title: "Completed Orders", value: 3, color: "green" }
  ];

  const recentAppointments = [
  { 
    time: "9:30 AM", 
    name: "John Doe", 
    service: "Customize Jersey", 
    action: "View Details",
    amount: "5 pcs",
    phoneNumber: "09123456789"
  },
  { 
    time: "11:00 AM", 
    name: "Jane Smith", 
    service: "Customize Jersey", 
    action: "View Details",
    amount: "8 pcs",
    phoneNumber: "09987654321"
  },
  { 
    time: "1:00 PM", 
    name: "Sam Wilson", 
    service: "Customize Jersey", 
    action: "View Details",
    amount: "10 pcs",
    phoneNumber: "09011223344"
  }
];

  const liveQueue = {
    current: { number: "001", name: "Juan Dela Cruz" },
    next: { number: "002", name: "Dianne Javellana" }
  };

  const upcomingDueDates = [
    {
      name: "Kristine Arado",
      service: "Full set jersey (100 pcs.)",
      date: "10 May, 2025",
      time: "04:00 PM",
      initial: "K"
    },
    {
      name: "Mark Cyril Villazon",
      service: "Full set jersey (100 pcs.)", 
      date: "15 May, 2025",
      time: "01:00 PM",
      initial: "M"
    }
  ];

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
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Name</th>
                      <th>Service</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((appointment, index) => (
                      <tr key={index}>
                        <td>{appointment.time}</td>
                        <td>{appointment.name}</td>
                        <td>{appointment.service}</td>
                        <td>
                          <span
                            className="action-link"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowDetails(true);
                            }}
                          >
                            {appointment.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    <div className="dashboard-modal-panel">
      <h2 className="dashboard-modal-title">Appointment Details</h2>
      <div className="dashboard-details-container" style={{flexDirection: 'row', gap: '30px'}}>
        <div className="dashboard-details-left">
          <div className="dashboard-detail-group">
            <div className="dashboard-detail-label">Full Name</div>
            <div className="dashboard-detail-value">{selectedAppointment.name}</div>
          </div>
          <div className="dashboard-detail-group">
            <div className="dashboard-detail-label">Service Type</div>
            <div className="dashboard-detail-value">{selectedAppointment.service}</div>
          </div>
          <div className="dashboard-detail-group">
            <div className="dashboard-detail-label">Amount of Clothes</div>
            <div className="dashboard-detail-value">{selectedAppointment.amount || '10 pcs'}</div>
          </div>
          <div className="dashboard-detail-group">
            <div className="dashboard-detail-label">Phone Number</div>
            <div className="dashboard-detail-value">{selectedAppointment.phoneNumber || '09123456789'}</div>
          </div>
        </div>
        <div className="dashboard-details-right">
          <div className="dashboard-image-group">
            <div className="dashboard-image-label">Design Image</div>
            <img 
              src="jersey.jpg" 
              alt="Jersey Design" 
              className="dashboard-modal-image" 
              style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
            />
          </div>
          <div className="dashboard-image-group">
            <div className="dashboard-image-label">Gcash Downpayment</div>
            <img 
              src="gcash.png" 
              alt="Gcash Payment" 
              className="dashboard-modal-image" 
              style={{ width: '100%', height: '120px', objectFit: 'cover', border: '1px solid #ddd' }}
            />
          </div>
        </div>
      </div>
      <button className="dashboard-modal-button" onClick={() => setShowDetails(false)}>Close</button>
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
                  {upcomingDueDates.map((item, index) => (
                    <div key={index} className="due-date-item">
                      <div className="avatar">
                        <FaUser />
                      </div>
                      <div className="due-date-info">
                        <div className="customer-name">{item.name}</div>
                        <div className="service">{item.service}</div>
                        <div className="date-time">{item.date} • {item.time}</div>
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