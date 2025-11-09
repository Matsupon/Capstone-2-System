import React, { useState, useEffect } from 'react';
import { FaUser, FaBell } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api';
import '../styles/Header.css';

const Header = () => {
  const navigate = useNavigate();
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!adminToken) {
      navigate('/login');
      return;
    }

    const fetchNotifications = async () => {
      try {
        const [notificationsRes, countRes] = await Promise.all([
          api.get('/admin/notifications'),
          api.get('/admin/notifications/unviewed-count')
        ]);
        
        if (notificationsRes.data?.success) {
          setAdminNotifications(notificationsRes.data.data || []);
        }
        if (countRes.data?.success) {
          setUnviewedCount(countRes.data.data?.unviewed_count || 0);
        }
      } catch (e) {
        console.error('Failed to fetch admin notifications', e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [adminToken, navigate]);

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    
    if (!notification.is_viewed) {
      try {
        await api.patch(`/admin/notifications/${notification.id}/viewed`);
        setAdminNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_viewed: true } : n
        ));
        setUnviewedCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error('Failed to mark notification as viewed', e);
      }
    }
  };

  if (!adminToken) {
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (showNotifications) {
                  setShowAllNotifications(false);
                }
              }}
              className="notification-bell-button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s ease',
              }}
            >
              <FaBell size={20} color="#4682B4" />
              {unviewedCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#e11d48',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}>
                  {unviewedCount > 9 ? '9+' : unviewedCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '300px',
                maxWidth: '400px',
                maxHeight: showAllNotifications ? '320px' : 'auto',
                overflowY: showAllNotifications ? 'auto' : 'visible',
                zIndex: 1000,
              }}>
                {adminNotifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#687076' }}>
                    No notifications
                  </div>
                ) : (
                  <>
                    {(showAllNotifications ? adminNotifications : adminNotifications.slice(0, 3)).map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          background: !notif.is_viewed ? '#e6f0ff' : 'white',
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#687076' }}>
                          {new Date(notif.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {!showAllNotifications && adminNotifications.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllNotifications(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#f8f9fa',
                          border: 'none',
                          borderTop: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          color: '#4682B4',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderRadius: '0 0 8px 8px',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                        onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
                      >
                        See all notifications
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <Link to="/profile" className="profile-link">
            <div className="profile-picture">
              <FaUser />
            </div>
          </Link>
          <span className="user-role">{adminData.fullname || 'Administrator'}</span>
        </div>
      </div>

      {/* Notification Detail Modal */}
      {showNotificationModal && selectedNotification && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            width: '100vw',
            height: '100vh',
          }}
          onClick={() => setShowNotificationModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNotificationModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
              }}
            >
              <AiOutlineClose />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
              {selectedNotification.title}
            </h2>
            <p style={{ color: '#687076', lineHeight: '1.6' }}>
              {selectedNotification.body || 'No additional information.'}
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;