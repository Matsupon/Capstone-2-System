import React from 'react';
import { FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
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
          <span className="user-role">ADMINISTRATOR</span>
        </div>
      </div>
    </header>
  );
};

export default Header; 