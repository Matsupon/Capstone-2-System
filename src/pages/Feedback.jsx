import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import api from '../api';
import '../styles/Feedback.css';

const StarRating = ({ value }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="star-rating" aria-label={`Rating: ${value} of 5`}>
      {stars.map((s) => (
        <span key={s} className={s <= value ? 'star on' : 'star'}>★</span>
      ))}
    </div>
  );
};

const useStorageBase = () =>
  useMemo(
    () => (process.env.NODE_ENV === 'development' ? 'http://192.168.10.87:8000' : ''),
    []
  );

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const storageBase = useStorageBase();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedback');
      if (res.data?.success) setItems(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (id) => {
    const payload = {};
    const r = responding[id] || {};
    if (typeof r.admin_checked !== 'undefined') payload.admin_checked = r.admin_checked;
    if (typeof r.admin_response !== 'undefined') payload.admin_response = r.admin_response;
    try {
      const res = await api.patch(`/feedback/${id}/respond`, payload);
      if (res.data?.success) {
        await load();
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to update response');
    }
  };

  const setResp = (id, patch) =>
    setResponding((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title"><h1>FEEDBACK</h1></div>
          <div className="feedback-outer">
            <div className="feedback-card-container">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title"><h1>FEEDBACK</h1></div>
          <div className="feedback-outer">
            <div className="feedback-card-container" style={{ color: '#c62828' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout feedback-page-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-title"><h1>FEEDBACK</h1></div>
        <div className="feedback-outer">
          {/* container is now relative so popup can center inside it */}
          <div className="feedback-card-container feedback-card-relative">
            {items.length === 0 ? (
              <p className="feedback-empty">No feedback yet.</p>
            ) : (
              <div className="feedback-list">
                {items.map((fb) => {
                  const user = fb?.order?.appointment?.user;
                  const appt = fb?.order?.appointment;
                  const pending = responding[fb.id] || {};

                  const profileUrl = user?.profile_image
                    ? `${storageBase}/storage/${user.profile_image}`
                    : null;

                  return (
                    <article key={fb.id} className="feedback-item card">
                      <header className="card-header">
                        <div className="card-header-left">
                          {profileUrl ? (
                            <img src={profileUrl} alt="avatar" className="avatar-img" />
                          ) : (
                            <div className="feedback-avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</div>
                          )}
                          <div className="header-meta">
                            <div className="meta-line">
                              <span className="feedback-name">{user?.name || 'Unknown Customer'}</span>
                              <span className="dot" />
                              <span className="feedback-date">{formatDate(fb.created_at)}</span>
                            </div>
                            <div className="meta-sub">{appt?.service_type || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="card-header-right">
                          <StarRating value={fb.rating} />
                          <button
                            className={`check-pill ${responding[fb.id]?.admin_checked ?? fb.admin_checked ? 'on' : ''}`}
                            title={(responding[fb.id]?.admin_checked ?? fb.admin_checked) ? 'Checked' : 'Mark as checked'}
                            onClick={() => {
                              const next = !(responding[fb.id]?.admin_checked ?? fb.admin_checked);
                              setResp(fb.id, { admin_checked: next });
                              handleSubmit(fb.id);
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </header>

                      <div className="card-body">
                        <p className="feedback-comment">{fb.comment || 'No comment provided.'}</p>
                      </div>

                      <footer className="card-footer">
                        <textarea
                          rows={2}
                          className="feedback-textarea"
                          placeholder="Write a comment to the customer..."
                          defaultValue={fb.admin_response || ''}
                          onChange={(e) => setResp(fb.id, { admin_response: e.target.value })}
                        />
                        <div className="footer-actions">
                          <button
                            className={`send-btn ${((responding[fb.id]?.admin_response ?? '') || '').trim() ? 'enabled' : ''}`}
                            disabled={!(((responding[fb.id]?.admin_response ?? '') || '').trim())}
                            onClick={() => handleSubmit(fb.id)}
                          >
                            Send
                          </button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
            {updateSuccess && (
              <div className="popup-success inside-card">
                <h3>Response sent successfully!</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
