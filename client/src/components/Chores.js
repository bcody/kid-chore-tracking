import React, { useState, useEffect, useCallback } from 'react';
import { getChores, checkChore, saveNote } from '../api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  return DAYS.map((label, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      label,
      key: d.toISOString().slice(0, 10),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

const styles = {
  section: { marginBottom: 24 },
  weekRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 12,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  dayBadge: {
    minWidth: 44,
    textAlign: 'center',
    padding: '6px 4px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  choreCard: {
    background: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  },
  choreName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  },
  daysRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    border: '2px solid #ddd',
    background: '#f8f8f8',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#999',
    transition: 'all 0.15s',
  },
  dayBtnDone: {
    border: '2px solid #27ae60',
    background: '#eafaf1',
    color: '#27ae60',
  },
  dayBtnToday: {
    border: '2px solid #4a90d9',
  },
  check: { fontSize: 18 },
  empty: { color: '#aaa', textAlign: 'center', padding: 32 },
  loading: { color: '#aaa', textAlign: 'center', padding: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 10 },
  notesSection: { marginTop: 24 },
  notesLabel: { fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 },
  notesTextarea: {
    width: '100%',
    minHeight: 80,
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  notesSaveBtn: {
    marginTop: 8,
    padding: '7px 18px',
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  notesSaved: { color: '#27ae60', marginLeft: 10, fontSize: 13 },
};

export default function Chores({ user }) {
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const weekDates = getWeekDates();

  const fetchChores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChores(user.username);
      setChores(data.chores);
      setCompletions(data.completions);
      setNote(data.note || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchChores();
  }, [fetchChores]);

  async function toggle(choreId, day) {
    const current = completions[day]?.[choreId] || false;
    const newVal = !current;
    setCompletions(prev => ({
      ...prev,
      [day]: { ...prev[day], [choreId]: newVal },
    }));
    try {
      await checkChore(user.username, choreId, day, newVal);
    } catch (e) {
      // revert on error
      setCompletions(prev => ({
        ...prev,
        [day]: { ...prev[day], [choreId]: current },
      }));
    }
  }

  async function handleNoteSave() {
    try {
      await saveNote(user.username, note);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div style={styles.loading}>Loading chores…</div>;
  if (!chores.length) return <div style={styles.empty}>No chores yet! 🎉</div>;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>📋 {user.username}'s Chores</div>
      <div style={styles.weekRow}>
        {weekDates.map(({ label, key, isToday }) => (
          <div
            key={key}
            style={{
              ...styles.dayBadge,
              background: isToday ? '#4a90d9' : '#e8edf2',
              color: isToday ? '#fff' : '#555',
            }}
          >
            {label}
          </div>
        ))}
      </div>
      {chores.map(chore => (
        <div key={chore.id} style={styles.choreCard}>
          <div style={styles.choreName}>{chore.name}</div>
          <div style={styles.daysRow}>
            {weekDates.map(({ label, key, isToday }) => {
              const done = completions[key]?.[chore.id] || false;
              return (
                <button
                  key={key}
                  onClick={() => toggle(chore.id, key)}
                  style={{
                    ...styles.dayBtn,
                    ...(done ? styles.dayBtnDone : {}),
                    ...(isToday && !done ? styles.dayBtnToday : {}),
                  }}
                  title={`${label} — ${done ? 'Done' : 'Not done'}`}
                >
                  <span>{label}</span>
                  {done && <span style={styles.check}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={styles.notesSection}>
        <div style={styles.notesLabel}>📝 Notes</div>
        <textarea
          style={styles.notesTextarea}
          value={note}
          onChange={e => { setNote(e.target.value); setNoteSaved(false); }}
          placeholder="Leave a note for this week…"
        />
        <div>
          <button style={styles.notesSaveBtn} onClick={handleNoteSave}>
            Save Note
          </button>
          {noteSaved && <span style={styles.notesSaved}>✓ Saved!</span>}
        </div>
      </div>
    </div>
  );
}
