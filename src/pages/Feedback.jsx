import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import api from '../api';
import '../styles/Feedback.css';

const StarRating = ({ value }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="star-rating">
      {stars.map((s) => (
        <span key={s} style={{ color: s <= value ? '#f5a623' : '#d8dee6' }}>★</span>
      ))}
    </div>
  );
};

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

  const setResp = (id, patch) => setResponding((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-title"><h1>FEEDBACK</h1></div>
          <div className="feedback-card-container">Loading...</div>
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
          <div className="feedback-card-container" style={{ color: '#c62828' }}>{error}</div>
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
        <div className="feedback-card-container">
          {items.length === 0 ? (
            <p className="feedback-empty">No feedback yet.</p>
          ) : (
            <div className="feedback-list">
              {items.map((fb) => {
                const user = fb?.order?.appointment?.user;
                const appt = fb?.order?.appointment;
                const pending = responding[fb.id] || {};
                const hasChanges = (
                  (typeof pending.admin_checked !== 'undefined' && pending.admin_checked !== !!fb.admin_checked) ||
                  (typeof pending.admin_response !== 'undefined' && (pending.admin_response ?? '') !== (fb.admin_response ?? ''))
                );

                return (
                  <div key={fb.id} className="feedback-item">
                    {/* Header info */}
                    <div className="feedback-header">
                      <div className="feedback-avatar">{(user?.name || 'U').slice(0,1).toUpperCase()}</div>
                      <div className="feedback-title">
                        <span className="feedback-name">{user?.name || 'Unknown Customer'}</span>
                        <span className="feedback-service">{appt?.service_type || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Chat bubbles */}
                    <div className="feedback-bubbles">
                      {/* Customer bubble */}
                      <div className="feedback-bubble-customer">
                        <div className="feedback-bubble-customer-inner">
                          <div style={{ marginBottom: 6 }}><StarRating value={fb.rating} /></div>
                          <div className="feedback-comment">{fb.comment || 'No comment provided.'}</div>
                        </div>
                      </div>

                      {/* Admin bubble (editor) */}
                      <div className="feedback-bubble-admin">
                        <div className="feedback-bubble-admin-inner">
                          <label className="feedback-admin-checkrow">
                            <input
                              type="checkbox"
                              defaultChecked={!!fb.admin_checked}
                              onChange={(e) => setResp(fb.id, { admin_checked: e.target.checked })}
                            />
                            <span style={{ color: '#000' }}>{(responding[fb.id]?.admin_checked ?? fb.admin_checked) ? 'Checked' : 'Not checked'}</span>
                          </label>
                          <textarea
                            rows={2}
                            className="feedback-textarea"
                            placeholder="Write an optional response to the customer..."
                            defaultValue={fb.admin_response || ''}
                            onChange={(e) => setResp(fb.id, { admin_response: e.target.value })}
                          />
                          <div className="feedback-actions">
                            <button
                              onClick={() => handleSubmit(fb.id)}
                              disabled={!hasChanges}
                              className="feedback-save-btn"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="feedback-divider" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {updateSuccess && (
          <div className="popup-success">
            <h3 style={{ color: '#4caf50', margin: 0, fontSize: 16 }}>Response updated successfully</h3>
          </div>
        )}
      </div>
    </div>
  );
}
