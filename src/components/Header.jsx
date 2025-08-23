import React from 'react';
import { FaUser } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const navigate = useNavigate();
  
  // Get admin data from localStorage
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const adminToken = localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/login');
  };

  // If no token, redirect to login
  if (!adminToken) {
    navigate('/login');
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {/* Logo or branding can go here */}
        </div>
        <div className="header-right">
          <Link to="/profile" className="profile-link">
            <div className="profile-picture">
              <FaUser />
            </div>
          </Link>
          <span className="user-role">{adminData.fullname || 'Administrator'}</span>
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              marginLeft: '15px',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;