import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import '../styles/Feedback.css';
import { FaTrash } from 'react-icons/fa';

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
  useMemo(() => {
    const base = (api?.defaults?.baseURL) || '';
    if (!base) return '';
    // Derive the non-API origin/path from axios baseURL (e.g., http://IP:8000/api -> http://IP:8000)
    try {
      const u = new URL(base, window.location.origin);
      const path = u.pathname.replace(/\/?api\/?$/, '');
      return `${u.origin}${path.endsWith('/') ? path.slice(0, -1) : path}`;
    } catch {
      // Fallback for odd baseURL values
      return base.replace(/\/?api\/?$/, '');
    }
  }, []);

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

// Safely build a public URL for a storage-backed image path
const buildImageUrl = (storageBase, path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const cleanBase = storageBase?.replace(/\/$/, '') || '';
  const cleanPath = String(path).replace(/^\//, '');
  if (cleanPath.startsWith('storage/')) return `${cleanBase}/${cleanPath}`;
  return `${cleanBase}/storage/${cleanPath}`;
};

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [animateStats, setAnimateStats] = useState(false);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [displayAvg, setDisplayAvg] = useState(0);
  const storageBase = useStorageBase();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Remove page-level scrolling for this page to enable container scrolling
  useEffect(() => {
    document.body.classList.remove('feedback-scroll');
    return () => document.body.classList.remove('feedback-scroll');
  }, []);

  const stats = useMemo(() => {
    if (!items?.length) return { total: 0, avg: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const it of items) {
      const r = Math.max(1, Math.min(5, Math.round(Number(it.rating) || 0)));
      dist[r] += 1;
      sum += r;
    }
    return { total: items.length, avg: sum / items.length, dist };
  }, [items]);

  useEffect(() => {
    if (!loading && !error) {
      setAnimateStats(false);
      setDisplayTotal(0);
      setDisplayAvg(0);
      const start = performance.now();
      const dur = 1000;
      const totalTarget = stats.total;
      const avgTarget = Number(stats.avg.toFixed(1));
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        setDisplayTotal(Math.round(totalTarget * p));
        setDisplayAvg(Number((avgTarget * p).toFixed(1)));
        if (p < 1) requestAnimationFrame(tick); else setAnimateStats(true);
      };
      requestAnimationFrame(tick);
    }
  }, [loading, error, stats.total, stats.avg]);

  const handleSubmit = async (id) => {
    const payload = {};
    const r = responding[id] || {};
    if (typeof r.admin_checked !== 'undefined') payload.admin_checked = r.admin_checked;
    if (typeof r.admin_response !== 'undefined') payload.admin_response = r.admin_response;
    try {
      const res = await api.patch(`/feedback/${id}/respond`, payload);
      if (res.data?.success) {
        // optimistic update locally to avoid full refresh
        setItems((prev) => prev.map((it) =>
          it.id === id
            ? {
                ...it,
                admin_checked: typeof payload.admin_checked !== 'undefined' ? payload.admin_checked : it.admin_checked,
                admin_response: typeof payload.admin_response !== 'undefined' ? payload.admin_response : it.admin_response,
              }
            : it
        ));
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to update response');
    }
  };

  const setResp = (id, patch) =>
    setResponding((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    try {
      setDeleting(prev => ({ ...prev, [id]: true }));
      const res = await api.delete(`/feedback/${id}`);
      
      if (res.data?.success) {
        // Remove the feedback from the local state
        setItems(prev => prev.filter(item => item.id !== id));
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to delete feedback');
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-title"><h1>FEEDBACK</h1></div>
        <div className="feedback-outer">
          <div className="feedback-card-container">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="page-title"><h1>FEEDBACK</h1></div>
        <div className="feedback-outer">
          <div className="feedback-card-container" style={{ color: '#c62828' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap feedback-page-wrapper">
      <div className="page-title"><h1>FEEDBACK</h1></div>
      <div className="feedback-outer">
          <div className="feedback-stats">
            <div className="stat-block">
              <div className="stat-title">Total Reviews</div>
              <div className="stat-number">{displayTotal}</div>
              <div className="stat-sub">Growth in reviews this year</div>
            </div>
            <div className="stat-sep" />
            <div className="stat-block">
              <div className="stat-title">Average Rating</div>
              <div className="stat-number">{displayAvg.toFixed(1)}</div>
              <StarRating value={Math.round(stats.avg)} />
              <div className="stat-sub">Average rating this year</div>
            </div>
            <div className="stat-sep" />
            <div className="stat-block dist-block">
              {[5,4,3,2,1].map((s) => {
                const pct = stats.total ? Math.round((stats.dist[s] / stats.total) * 100) : 0;
                return (
                  <div key={s} className="dist-row">
                    <span className="dist-label">{s}</span>
                    <div className={`dist-bar ${animateStats ? 'animate' : ''} star-${s}`} style={{ width: animateStats ? `${pct}%` : 0 }} />
                    <span className="dist-value">{stats.dist[s]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* container is now relative so popup can center inside it */}
          <div className="feedback-card-container feedback-card-relative">
            {items.length === 0 ? (
              <p className="feedback-empty">No feedback yet.</p>
            ) : (
              <div className="feedback-list">
                {currentItems.map((fb) => {
                  const user = fb?.order?.appointment?.user;
                  const appt = fb?.order?.appointment;
                  const pending = responding[fb.id] || {};

                  const profileUrl = buildImageUrl(storageBase, user?.profile_image);

                  return (
                    <article key={fb.id} className="feedback-item">
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className={`check-pill ${responding[fb.id]?.admin_checked ?? fb.admin_checked ? 'on' : ''}`}
                              title={(responding[fb.id]?.admin_checked ?? fb.admin_checked) ? 'Checked' : 'Mark as checked'}
                              onClick={() => {
                                const next = !(responding[fb.id]?.admin_checked ?? fb.admin_checked);
                                setResp(fb.id, { admin_checked: next });
                                handleSubmit(fb.id);
                              }}
                              style={{
                                color: (responding[fb.id]?.admin_checked ?? fb.admin_checked) ? '#0f7a28' : undefined,
                                borderColor: (responding[fb.id]?.admin_checked ?? fb.admin_checked) ? '#0f7a28' : undefined,
                                backgroundColor: (responding[fb.id]?.admin_checked ?? fb.admin_checked) ? '#E8F5E9' : undefined,
                                fontWeight: 700,
                              }}
                            >
                              ✓
                            </button>
                            <button
                              className="delete-btn"
                              title="Delete feedback"
                              onClick={() => handleDelete(fb.id)}
                              disabled={deleting[fb.id]}
                              style={{
                                background: 'none',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                cursor: deleting[fb.id] ? 'not-allowed' : 'pointer',
                                color: '#dc3545',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: deleting[fb.id] ? 0.6 : 1,
                              }}
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      </header>

                      <div className="card-body">
                        <p className="feedback-comment">{fb.comment || '(No comment provided.)'}</p>
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
            {deleteSuccess && (
              <div className="popup-success inside-card">
                <h3>Feedback deleted successfully!</h3>
              </div>
            )}
          </div>

          {/* Pagination Panel - Fixed at bottom */}
          {items.length > 0 && totalPages > 1 && (
            <div className="pagination-panel">
              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmId !== null && (
            <div className="dashboard-modal-bg animate-fade" onClick={() => setDeleteConfirmId(null)}>
              <div className="dashboard-modal-panel animate-pop" style={{ maxWidth: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 20, textAlign: 'center' }}>Are you sure you want to delete this feedback?</h3>
                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={confirmDelete}
                  >
                    Yes
                  </button>
                  <button
                    className="modal-button"
                    style={{ flex: 1, fontSize: 16, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer' }}
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
