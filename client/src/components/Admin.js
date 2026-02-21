import React, { useState, useEffect } from 'react';
import { getUsers, getChores, updateChoreList, resetWeek } from '../api';

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
};

export default function Admin({ user }) {
  const [kidUsers, setKidUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [resetMsg, setResetMsg] = useState(false);

  useEffect(() => {
    getUsers().then(users => {
      const kids = users.filter(u => u.role === 'kid');
      setKidUsers(kids);
      if (kids.length > 0) selectUser(kids[0].username);
    });
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
    setChores(prev => [...prev, { id: maxId + 1, name: '' }]);
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
    </div>
  );
}
