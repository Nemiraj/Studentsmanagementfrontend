import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import * as api from './api';
import './App.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY    = { name: '', email: '', age: '' };

function validate(f) {
  const e = {};
  if (!f.name.trim())          e.name  = 'Name is required';
  else if (f.name.trim().length < 2) e.name = 'At least 2 characters';
  if (!f.email.trim())         e.email = 'Email is required';
  else if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email';
  if (!f.age)                  e.age   = 'Age is required';
  else if (+f.age < 1 || +f.age > 120) e.age = 'Age must be 1–120';
  return e;
}

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? '✓' : '✕'} {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Modal ── */
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Student Form ── */
function StudentForm({ initial = EMPTY, onSubmit, loading }) {
  const [form, setForm]   = useState(initial);
  const [errors, setErrors] = useState({});
  const firstRef = useRef();

  useEffect(() => { firstRef.current?.focus(); }, []);

  const change = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const submit = () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ name: form.name.trim(), email: form.email.trim(), age: Number(form.age) });
  };

  return (
    <>
      <div className="form-grid">
        <div className="field">
          <label>Full Name <span className="req">*</span></label>
          <input ref={firstRef} name="name" value={form.name} onChange={change}
            placeholder="e.g. Jane Smith" className={errors.name ? 'err' : ''} />
          {errors.name && <span className="field-err">{errors.name}</span>}
        </div>
        <div className="field">
          <label>Email <span className="req">*</span></label>
          <input name="email" type="email" value={form.email} onChange={change}
            placeholder="e.g. jane@uni.edu" className={errors.email ? 'err' : ''} />
          {errors.email && <span className="field-err">{errors.email}</span>}
        </div>
        <div className="field field-sm">
          <label>Age <span className="req">*</span></label>
          <input name="age" type="number" min="1" max="120" value={form.age}
            onChange={change} placeholder="21" className={errors.age ? 'err' : ''} />
          {errors.age && <span className="field-err">{errors.age}</span>}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? <span className="spin" /> : null}
          {loading ? 'Saving…' : 'Save Student'}
        </button>
      </div>
    </>
  );
}

/* ── Main App ── */
export default function App() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null); // null | 'add' | {edit:s} | {del:s}
  const [toasts,   setToasts]   = useState([]);
  const [sort,     setSort]     = useState({ key: 'createdAt', dir: 'desc' });

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.getStudents(q);
      setStudents(data);
    } catch {
      addToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const handleAdd = async (data) => {
    setSaving(true);
    try {
      const s = await api.createStudent(data);
      setStudents(p => [s, ...p]);
      setModal(null);
      addToast('Student added successfully!');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add student', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async (data) => {
    setSaving(true);
    try {
      const updated = await api.updateStudent(modal.edit._id, data);
      setStudents(p => p.map(s => s._id === updated._id ? updated : s));
      setModal(null);
      addToast('Student updated!');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update student', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.deleteStudent(modal.del._id);
      setStudents(p => p.filter(s => s._id !== modal.del._id));
      setModal(null);
      addToast('Student deleted.', 'error');
    } catch {
      addToast('Failed to delete student', 'error');
    } finally { setSaving(false); }
  };

  const handleExport = () => {
    const rows = sorted.map(({ name, email, age }) => ({ Name: name, Email: email, Age: age }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 6 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `students_${new Date().toISOString().slice(0,10)}.xlsx`);
    addToast(`Exported ${rows.length} students`);
  };

  const handleSort = key => setSort(p =>
    p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  );

  const sorted = [...students].sort((a, b) => {
    let av = a[sort.key], bv = b[sort.key];
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
    if (av < bv) return sort.dir === 'asc' ? -1 : 1;
    if (av > bv) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const Th = ({ col, label }) => (
    <th onClick={() => handleSort(col)} className="sortable">
      {label}
      <span className={`arrow ${sort.key === col ? 'active' : ''}`}>
        {sort.key === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </span>
    </th>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">StudentBase</span>
          </div>
          <span className="badge">{students.length} Students</span>
        </div>
      </header>

      <main className="main">
        {/* Toolbar */}
        <div className="card toolbar-card">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search students…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
          </div>
          <div className="toolbar-right">
            <button className="btn btn-outline" onClick={handleExport} disabled={!students.length}>
              ⬇ Export Excel
            </button>
            <button className="btn btn-primary" onClick={() => setModal('add')}>
              + Add Student
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card table-card">
          {loading && <div className="progress-bar"><div className="progress" /></div>}

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <Th col="name"  label="Name" />
                  <Th col="email" label="Email" />
                  <Th col="age"   label="Age" />
                  <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      {search ? `No results for "${search}"` : 'No students yet. Add one!'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((s, i) => (
                    <tr key={s._id}>
                      <td className="num">{i + 1}</td>
                      <td>
                        <div className="name-cell">
                          <div className="avatar">{s.name.charAt(0).toUpperCase()}</div>
                          {s.name}
                        </div>
                      </td>
                      <td className="email-cell">{s.email}</td>
                      <td className="center">
                        <span className="age-pill">{s.age}</span>
                      </td>
                      <td className="center actions-cell">
                        <button className="action-btn edit" onClick={() => setModal({ edit: s })}>Edit</button>
                        <button className="action-btn del"  onClick={() => setModal({ del: s })}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            {sorted.length} of {students.length} students
            {search && ` — filtered by "${search}"`}
          </div>
        </div>
      </main>

      {/* Add Modal */}
      {modal === 'add' && (
        <Modal title="Add New Student" onClose={() => setModal(null)}>
          <StudentForm onSubmit={handleAdd} loading={saving} />
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.edit && (
        <Modal title="Edit Student" onClose={() => setModal(null)}>
          <StudentForm
            initial={{ name: modal.edit.name, email: modal.edit.email, age: String(modal.edit.age) }}
            onSubmit={handleEdit}
            loading={saving}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {modal?.del && (
        <Modal title="Delete Student" onClose={() => setModal(null)}>
          <div className="delete-body">
            <div className="del-avatar">{modal.del.name.charAt(0)}</div>
            <p>Remove <strong>{modal.del.name}</strong> from the system?</p>
            <p className="del-sub">This cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? <span className="spin" /> : null}
              {saving ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </Modal>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
