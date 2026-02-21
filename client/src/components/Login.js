import React, { useState } from 'react';
import { login } from '../api';

const styles = {
  container: {
    maxWidth: 360,
    margin: '80px auto',
    background: '#fff',
    borderRadius: 12,
    padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    color: '#4a90d9',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 16,
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 12,
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: '#aaa',
  },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>🌟 Chore Tracker</div>
      <div style={styles.subtitle}>Sign in to see your chores</div>
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <div style={styles.hint}>Logins: kid1 / kid2 / admin (password same as username)</div>
    </div>
  );
}
