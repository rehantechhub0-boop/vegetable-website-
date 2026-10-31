import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  Edit,
  Trash2,
  Key,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'EDITOR' | 'VIEWER';
  createdAt: string;
}

export const AdminStaff: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [password, setPassword] = useState('Staff@Sabzi2026!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Selection State
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRole, setBulkRole] = useState<'MANAGER' | 'EDITOR' | 'VIEWER'>('EDITOR');

  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const nonOwnerStaff = staffList.filter((s) => s.role !== 'OWNER' && s.email !== 'rehan.techhub0@gmail.com');

  const toggleSelectAllStaff = () => {
    if (selectedStaffIds.length === nonOwnerStaff.length && nonOwnerStaff.length > 0) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(nonOwnerStaff.map((s) => s.id));
    }
  };

  const handleBulkStaffAction = async (action: 'delete' | 'change-role') => {
    if (selectedStaffIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Kya aap waqai in ${selectedStaffIds.length} staff members ka access revoke karna chahte hain?`)) {
      return;
    }

    setBulkLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/admin/staff/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          staffIds: selectedStaffIds,
          role: action === 'change-role' ? bulkRole : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bulk staff operation failed.');
      }
      setSuccessMsg(data.message || 'Bulk staff action successful!');
      setSelectedStaffIds([]);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Bulk action error.');
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/staff', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setStaffList(data.data);
      } else {
        setError(data.error || 'Staff list load karne me masla pesh aaya.');
      }
    } catch {
      setError('Server connection failed while fetching staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Meharbani karke valid email address darj karein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Staff member add nahi ho saka.');
      }

      setSuccessMsg(`Staff member ${data.staff.email} kamyabi se add ho gaya (${data.staff.role})!`);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('Staff@Sabzi2026!');
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeStaff = async (staffId: string, staffName: string) => {
    if (!window.confirm(`Kya aap waqai ${staffName} ka access khatam karna chahte hain?`)) return;

    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/staff/${staffId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Access revoke nahi ho saka.');
      }
      setSuccessMsg(`${staffName} ka access kamyabi se khatam kar diya gaya.`);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff member.');
    }
  };

  const handleRoleChange = async (staffId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/admin/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Role update ho kar ${newRole} ban gaya.`);
        fetchStaff();
      } else {
        setError(data.error || 'Role update nahi ho saka.');
      }
    } catch {
      setError('Failed to update role.');
    }
  };

  const copyCredentials = (staffEmail: string, pass: string) => {
    const text = `Muzaffargarh Fresh Vegetables Staff Login:\nEmail: ${staffEmail}\nPassword: ${pass}\nWebsite: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setSuccessMsg(`${staffEmail} ke login credentials copy ho gaye!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'OWNER':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> Owner / Malik
          </span>
        );
      case 'MANAGER':
        return (
          <span style={{ backgroundColor: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={13} /> Store Manager
          </span>
        );
      case 'EDITOR':
      case 'STAFF':
        return (
          <span style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Edit size={13} /> Products & Stock Editor
          </span>
        );
      case 'VIEWER':
        return (
          <span style={{ backgroundColor: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Eye size={13} /> Viewer (Orders Only)
          </span>
        );
      default:
        return <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.75rem' }}>{userRole}</span>;
    }
  };

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-headline)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users color="#059669" size={24} />
            <span>Staff & Permissions Management (عملہ اور اختیارات)</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Apne staff members ko add karein aur unko Manager, Editor ya Viewer ke roles assign karein.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStaff}
          className="admin-btn admin-btn--secondary"
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <Check size={18} color="#059669" style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Owner Badge Card */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            👑
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1rem', color: '#92400e' }}>Rehan Qadri (Store Owner)</strong>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #fde68a' }}>
                Primary Account
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '2px' }}>
              rehan.techhub0@gmail.com • Mukammal Store Authority & Control
            </p>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
          Super Admin Status: Active & Secured
        </div>
      </div>

      {/* Add New Staff Member Card */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-headline)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <UserPlus size={18} color="#059669" />
          <span>Naya Staff Member Ya Manager Shamil Karein</span>
        </h2>

        <form onSubmit={handleAddStaff}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.35rem' }}>
                Staff Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Muhammad Asad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.35rem' }}>
                Staff Gmail / Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="email"
                  placeholder="staff@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.35rem' }}>
                Phone Number (WhatsApp)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="tel"
                  placeholder="03XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.35rem' }}>
                Role & Permissions
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="MANAGER">👑 Store Manager (Mandi Rates & Sabziyan)</option>
                <option value="EDITOR">✏️ Inventory Editor (Stock & Daily Rates)</option>
                <option value="VIEWER">👁️ Viewer (Sirf Orders Dekh Sakta Hai)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.35rem' }}>
                Initial Login Password
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn admin-btn--primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <UserPlus size={16} />
              <span>{isSubmitting ? 'Staff Add Ho Raha Hai...' : 'Staff Member Shamil Karein'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Staff Members List */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-headline)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Shield size={18} color="#059669" />
          <span>Active Staff Members ({staffList.length})</span>
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Staff members load ho rahe hain...
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Abhi koi doosra staff member add nahi kiya gaya. Upar diye gaye form se naya staff shamil karein.
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, padding: '10px 14px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={nonOwnerStaff.length > 0 && selectedStaffIds.length === nonOwnerStaff.length}
                      onChange={toggleSelectAllStaff}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                      title="Select all staff"
                    />
                  </th>
                  <th style={{ padding: '10px 14px' }}>Staff Member</th>
                  <th style={{ padding: '10px 14px' }}>Contact</th>
                  <th style={{ padding: '10px 14px' }}>Role</th>
                  <th style={{ padding: '10px 14px' }}>Change Role</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((member) => {
                  const isOwner = member.role === 'OWNER' || member.email === 'rehan.techhub0@gmail.com';
                  const isChecked = selectedStaffIds.includes(member.id);
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: isChecked ? '#f0fdf4' : undefined }}>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                        {!isOwner && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectStaff(member.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-headline)' }}>{member.name || 'Staff Member'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{member.email}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-body)' }}>
                        {member.phone || 'No phone'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {getRoleBadge(member.role)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {member.role === 'OWNER' ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Protected (Owner)</span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '0.8rem',
                              backgroundColor: '#f8fafc',
                            }}
                          >
                            <option value="MANAGER">Manager</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {member.role === 'OWNER' ? (
                          <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Super Admin</span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => copyCredentials(member.email, 'Staff@Sabzi2026!')}
                              title="Copy Login Details"
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'var(--text-body)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Copy size={13} />
                              <span>Copy Login</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeStaff(member.id, member.name || member.email)}
                              title="Revoke Access"
                              style={{
                                background: 'none',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fef2f2',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky Staff Bulk Action Bar */}
        {selectedStaffIds.length > 0 && (
          <div
            style={{
              position: 'sticky',
              bottom: '1rem',
              zIndex: 100,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                👥 {selectedStaffIds.length} staff selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedStaffIds([])}
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                  }}
                >
                  <option value="MANAGER">Store Manager</option>
                  <option value="EDITOR">Inventory Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleBulkStaffAction('change-role')}
                  disabled={bulkLoading}
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Set Role
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleBulkStaffAction('delete')}
                disabled={bulkLoading}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ❌ Revoke / Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
