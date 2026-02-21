import React, { useState } from 'react';
import Login from './components/Login';
import Chores from './components/Chores';
import Admin from './components/Admin';

const styles = {
  app: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 12px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '2px solid #4a90d9',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: '#4a90d9',
    fontWeight: 700,
  },
  userInfo: {
    fontSize: 14,
    color: '#555',
  },
  logoutBtn: {
    marginLeft: 10,
    padding: '4px 12px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  adminToggle: {
    marginTop: 12,
    marginBottom: 4,
    display: 'flex',
    gap: 10,
  },
  toggleBtn: {
    padding: '6px 16px',
    border: '1px solid #4a90d9',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('chores'); // 'chores' | 'admin'

  function handleLogin(userData) {
    setUser(userData);
    setView('chores');
  }

  function handleLogout() {
    setUser(null);
    setView('chores');
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.title}>🌟 Chore Tracker</span>
        <div style={styles.userInfo}>
          <strong>{user.username}</strong>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {user.role === 'admin' && (
        <div style={styles.adminToggle}>
          <button
            style={{
              ...styles.toggleBtn,
              background: view === 'chores' ? '#4a90d9' : '#fff',
              color: view === 'chores' ? '#fff' : '#4a90d9',
            }}
            onClick={() => setView('chores')}
          >
            Chores View
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              background: view === 'admin' ? '#4a90d9' : '#fff',
              color: view === 'admin' ? '#fff' : '#4a90d9',
            }}
            onClick={() => setView('admin')}
          >
            Admin
          </button>
        </div>
      )}

      {view === 'admin' && user.role === 'admin' ? (
        <Admin user={user} />
      ) : (
        <Chores user={user} />
      )}
    </div>
  );
}
