import React from 'react';
import { FaUser } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const navigate = useNavigate();
  
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const adminToken = localStorage.getItem('adminToken');

  if (!adminToken) {
    navigate('/login');
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
        </div>
        <div className="header-right">
          <Link to="/profile" className="profile-link">
            <div className="profile-picture">
              <FaUser />
            </div>
          </Link>
          <span className="user-role">{adminData.fullname || 'Administrator'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;