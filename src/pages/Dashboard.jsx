import React from 'react';
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
  
    // Get month name
    const monthNames = ["January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"];
const currentMonthName = monthNames[currentMonth];

// Get days in current month
const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

// Get first day of month (0 = Sunday, 6 = Saturday)
const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const getRandomDays = () => {
    const days = [];
    while (days.length < 2) {
      const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
      if (randomDay !== today && !days.includes(randomDay)) {
        days.push(randomDay);
      }
    }
    return days;
  };

  const markedDates = [today, ...getRandomDays()];

  // Calendar data for May 2025
  const calendarDays = [
    // Empty days before the 1st of the month
    ...Array(firstDayOfMonth).fill(null),
    // Days of the current month
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
    // Empty days after the last day of month to complete the grid
    ...Array((7 - (firstDayOfMonth + daysInMonth) % 7) % 7).fill(null)
  ];


  // Sample data
  const quickStats = [
    { title: "Today's Appointments", value: 3, color: "blue" },
    { title: "Pending Orders", value: 7, color: "yellow" },
    { title: "Completed Orders", value: 3, color: "green" }
  ];

  const recentAppointments = [
    { time: "9:30 AM", name: "John Doe", service: "Customize Jersey", action: "View Details" },
    { time: "11:00 AM", name: "Jane Smith", service: "Customize Jersey", action: "View Details" },
    { time: "1:00 PM", name: "Sam Wilson", service: "Customize Jersey", action: "View Details" }
  ];

  const liveQueue = {
    current: { number: "001", name: "Juan Dela Cruz" },
    next: { number: "002", name: "Dianne Javellana" }
  };

  const upcomingDueDates = [
    {
      name: "Kristine Arado",
      service: "Full set jersey",
      date: "10 May, 2025",
      time: "04:00 PM",
      initial: "K"
    },
    {
      name: "Mark Cyril Villazon",
      service: "Full set jersey", 
      date: "15 May, 2025",
      time: "01:00 PM",
      initial: "M"
    }
  ];



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
                          <Link to="/appointments" className="action-link">
                            {appointment.action}
                          </Link>
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
          </div>

          <div className="right-panel">
            <div className="panel calendar-due-container">
              {/* Calendar */}
              <div className="calendar-section">
                <div className="calendar-header">
                  <h3>{currentMonthName} {currentYear}</h3>
                  <div className="calendar-nav">
                    <button className="nav-btn"><FaChevronLeft /></button>
                    <button className="nav-btn"><FaChevronRight /></button>
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
                    {calendarDays.map((day, index) => (
                      <div key={index} className={`calendar-date ${!day ? 'empty' : ''} ${day === today ? 'today' : ''}`}>
                        {day && (
                          <>
                            <span className="date-number">{day}</span>
                            {markedDates.includes(day) && <span className="red-dot"></span>}
                          </>
                        )}
                      </div>
                    ))}
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