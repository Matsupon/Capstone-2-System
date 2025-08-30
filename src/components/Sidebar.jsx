import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaTachometerAlt, FaCalendarAlt, FaShoppingBag, FaUsers, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: FaTachometerAlt },
    { path: '/appointments', name: 'Appointments', icon: FaCalendarAlt },
    { path: '/orders', name: 'Orders', icon: FaShoppingBag },
    { path: '/orders-history', name: "Order's History", icon: FaShoppingBag },
    { path: '/customers', name: 'Customers', icon: FaUsers },
  ];

  return (
    <>
      {isMobile && (
        <button className="mobile-menu-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo.png" alt="Jun Tailoring Logo" className="logo-image" />
            <h2>Jun Tailoring</h2>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon className="nav-icon" />
                <span className="nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;