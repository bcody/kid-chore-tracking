import React, { useState, useEffect } from 'react';
import { getUsers, getChores, updateChoreList, resetWeek, getWeeks, createWeek, freezeWeek } from '../api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const styles = {
  section: { marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 14 },
  userTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: {
    padding: '8px 18px',
    borderRadius: 6,
    border: '1px solid #ccc',
    cursor: 'pointer',
    fontSize: 14,
  },
  choreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  choreInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 15,
  },
  ratingToggleBtn: {
    padding: '6px 10px',
    border: '1px solid #aaa',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  removeBtn: {
    padding: '6px 12px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  },
  addBtn: {
    padding: '8px 16px',
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    marginTop: 6,
  },
  saveBtn: {
    padding: '10px 24px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    marginTop: 16,
  },
  saved: {
    color: '#27ae60',
    marginLeft: 12,
    fontSize: 14,
  },
  resetBtn: {
    padding: '10px 20px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    marginTop: 24,
  },
  resetMsg: { color: '#27ae60', marginLeft: 12, fontSize: 14 },
  loading: { color: '#aaa', padding: 20 },
  weekSection: { marginTop: 32, borderTop: '1px solid #e5e5e5', paddingTop: 20 },
  weekSectionTitle: { fontSize: 17, fontWeight: 700, color: '#333', marginBottom: 12 },
  weekRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    padding: '8px 12px',
    background: '#f8f9fb',
    borderRadius: 8,
    border: '1px solid #e5e5e5',
  },
  weekLabel: { flex: 1, fontSize: 14, color: '#333' },
  frozenBadge: {
    fontSize: 12,
    background: '#e8f4fd',
    color: '#2980b9',
    border: '1px solid #aed6f1',
    borderRadius: 4,
    padding: '2px 8px',
    fontWeight: 600,
  },
  freezeBtn: {
    padding: '5px 12px',
    background: '#8e44ad',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  createWeekBtn: {
    padding: '8px 18px',
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginTop: 10,
  },
};

export default function Admin({ user }) {
  const [kidUsers, setKidUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [resetMsg, setResetMsg] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [weekMsg, setWeekMsg] = useState('');

  function loadWeeks() {
    getWeeks().then(setWeeks).catch(() => {});
  }

  useEffect(() => {
    getUsers().then(users => {
      const kids = users.filter(u => u.role === 'kid');
      setKidUsers(kids);
      if (kids.length > 0) selectUser(kids[0].username);
    });
    loadWeeks();
  }, []);

  async function selectUser(username) {
    setSelectedUser(username);
    setLoading(true);
    setSaved(false);
    try {
      const data = await getChores(username);
      setChores(data.chores.map(c => ({ ...c })));
    } finally {
      setLoading(false);
    }
  }

  function handleChoreChange(index, value) {
    setChores(prev => prev.map((c, i) => (i === index ? { ...c, name: value } : c)));
    setSaved(false);
  }

  function addChore() {
    const maxId = chores.reduce((m, c) => Math.max(m, c.id || 0), 0);
    setChores(prev => [...prev, { id: maxId + 1, name: '', ratingType: 'binary' }]);
    setSaved(false);
  }

  function handleRatingTypeToggle(index) {
    setChores(prev =>
      prev.map((c, i) =>
        i === index
          ? { ...c, ratingType: c.ratingType === 'rating' ? 'binary' : 'rating' }
          : c
      )
    );
    setSaved(false);
  }

  function removeChore(index) {
    setChores(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function saveChores() {
    const cleaned = chores.filter(c => c.name.trim() !== '');
    await updateChoreList(selectedUser, cleaned);
    setChores(cleaned);
    setSaved(true);
  }

  async function handleReset() {
    if (!window.confirm('Reset the week? This will uncheck all chores and clear all notes.')) return;
    const password = window.prompt('Enter admin password to confirm:');
    if (password === null) return;
    try {
      await resetWeek(user.username, password);
      setResetMsg(true);
      setTimeout(() => setResetMsg(false), 2000);
      if (selectedUser) await selectUser(selectedUser);
    } catch (e) {
      window.alert('Reset failed. Check your password and try again.');
    }
  }

  function humanizeWeek(startDate) {
    const d = new Date(startDate + 'T00:00:00');
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const startStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const endStr =
      d.getMonth() === end.getMonth()
        ? `${end.getDate()}`
        : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
    return `${startStr} to ${endStr}`;
  }

  function getNextWeekStartDate() {
    if (weeks.length === 0) {
      // Default to current Sunday
      const today = new Date();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - today.getDay());
      return sunday.toISOString().slice(0, 10);
    }
    const sorted = weeks.slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
    const latest = new Date(sorted[0].startDate + 'T00:00:00');
    latest.setDate(latest.getDate() + 7);
    return latest.toISOString().slice(0, 10);
  }

  async function handleCreateWeek() {
    const password = window.prompt('Enter admin password to confirm:');
    if (password === null) return;
    const startDate = getNextWeekStartDate();
    try {
      await createWeek(user.username, password, startDate);
      loadWeeks();
      showWeekMsg(`✓ Week of ${humanizeWeek(startDate)} created!`);
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to create week.';
      window.alert(msg);
    }
  }

  async function handleFreezeWeek(weekStart) {
    if (!window.confirm(`Freeze the week of ${humanizeWeek(weekStart)}? This will snapshot the current chore lists.`)) return;
    const password = window.prompt('Enter admin password to confirm:');
    if (password === null) return;
    try {
      await freezeWeek(user.username, password, weekStart);
      loadWeeks();
      showWeekMsg('✓ Week frozen!');
    } catch (e) {
      window.alert('Failed to freeze week. Check your password and try again.');
    }
  }

  function showWeekMsg(msg) {
    setWeekMsg(msg);
    setTimeout(() => setWeekMsg(''), 2500);
  }

  return (
    <div style={styles.section}>
      <div style={styles.title}>🛠 Admin — Edit Chore Lists</div>
      <div style={styles.userTabs}>
        {kidUsers.map(u => (
          <button
            key={u.username}
            onClick={() => selectUser(u.username)}
            style={{
              ...styles.tab,
              background: selectedUser === u.username ? '#4a90d9' : '#fff',
              color: selectedUser === u.username ? '#fff' : '#333',
              borderColor: selectedUser === u.username ? '#4a90d9' : '#ccc',
            }}
          >
            {u.username}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading…</div>
      ) : (
        <>
          {chores.map((chore, i) => (
            <div key={chore.id} style={styles.choreRow}>
              <input
                style={styles.choreInput}
                value={chore.name}
                onChange={e => handleChoreChange(i, e.target.value)}
                placeholder="Chore name"
              />
              <button
                style={{
                  ...styles.ratingToggleBtn,
                  background: chore.ratingType === 'rating' ? '#f39c12' : '#eee',
                  color: chore.ratingType === 'rating' ? '#fff' : '#555',
                }}
                onClick={() => handleRatingTypeToggle(i)}
                title="Toggle rating type between binary (✓/✗) and 3-tier (😊/😐/😢)"
              >
                {chore.ratingType === 'rating' ? '😊 Rating' : '✓ Binary'}
              </button>
              <button style={styles.removeBtn} onClick={() => removeChore(i)}>
                ✕
              </button>
            </div>
          ))}
          <div>
            <button style={styles.addBtn} onClick={addChore}>
              + Add Chore
            </button>
          </div>
          <div>
            <button style={styles.saveBtn} onClick={saveChores}>
              Save
            </button>
            {saved && <span style={styles.saved}>✓ Saved!</span>}
          </div>
          <div>
            <button style={styles.resetBtn} onClick={handleReset}>
              🔄 Reset Week
            </button>
            {resetMsg && <span style={styles.resetMsg}>✓ Week reset!</span>}
          </div>
        </>
      )}

      <div style={styles.weekSection}>
        <div style={styles.weekSectionTitle}>📅 Week Management</div>
        {weeks.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 14, marginBottom: 10 }}>No weeks created yet.</div>
        ) : (
          weeks.map(w => (
            <div key={w.startDate} style={styles.weekRow}>
              <span style={styles.weekLabel}>Week of {humanizeWeek(w.startDate)}</span>
              {w.frozen ? (
                <span style={styles.frozenBadge}>🔒 Frozen</span>
              ) : (
                <button style={styles.freezeBtn} onClick={() => handleFreezeWeek(w.startDate)}>
                  🔒 Freeze Week
                </button>
              )}
            </div>
          ))
        )}
        <div>
          <button style={styles.createWeekBtn} onClick={handleCreateWeek}>
            + Create New Week
          </button>
          {weekMsg && <span style={styles.resetMsg}>{weekMsg}</span>}
        </div>
      </div>
    </div>
  );
}
