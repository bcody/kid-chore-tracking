import React, { useState, useEffect, useCallback } from 'react';
import { getChores, checkChore, saveNote, getWeeks } from '../api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FIRST_WEEK_START = '2026-02-22';

const RATING_CYCLE = [null, 'happy', 'neutral', 'sad'];
const RATING_ICON = { happy: '😊', neutral: '😐', sad: '😢' };
const RATING_VALID = new Set(['happy', 'neutral', 'sad']);

function getSundayOffset(offsetWeeks) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek + offsetWeeks * 7);
  return sunday;
}

function getWeekDates(offsetWeeks = 0) {
  const sunday = getSundayOffset(offsetWeeks);
  const today = new Date();
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

function humanizeWeekRange(weekDates) {
  const first = new Date(weekDates[0].key + 'T00:00:00');
  const last = new Date(weekDates[6].key + 'T00:00:00');
  const startStr = `${MONTHS[first.getMonth()]} ${first.getDate()}`;
  const endStr =
    first.getMonth() === last.getMonth()
      ? `${last.getDate()}`
      : `${MONTHS[last.getMonth()]} ${last.getDate()}`;
  return `Week of ${startStr} to ${endStr}`;
}

function getFirstWeekOffset() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - dayOfWeek);
  thisSunday.setHours(0, 0, 0, 0);
  const firstSunday = new Date(FIRST_WEEK_START + 'T00:00:00');
  const diffMs = firstSunday.getTime() - thisSunday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function getWeekOffsetFromStartDate(startDate) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - dayOfWeek);
  thisSunday.setHours(0, 0, 0, 0);
  const weekSunday = new Date(startDate + 'T00:00:00');
  const diffMs = weekSunday.getTime() - thisSunday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

const styles = {
  section: { marginBottom: 24 },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  weekNavBtn: {
    padding: '6px 14px',
    fontSize: 18,
    background: '#f0f4fa',
    border: '1px solid #c5d3e8',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#4a90d9',
    fontWeight: 700,
    lineHeight: 1,
  },
  weekNavBtnDisabled: {
    opacity: 0.35,
    cursor: 'default',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: '#4a90d9',
  },
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
  dayBtnHappy: {
    border: '2px solid #27ae60',
    background: '#eafaf1',
    color: '#27ae60',
  },
  dayBtnNeutral: {
    border: '2px solid #f39c12',
    background: '#fef9e7',
    color: '#f39c12',
  },
  dayBtnSad: {
    border: '2px solid #e74c3c',
    background: '#fdf0ed',
    color: '#e74c3c',
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekBounds, setWeekBounds] = useState(null);

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].key;
  const firstWeekOffset = getFirstWeekOffset();
  const minOffset = weekBounds ? weekBounds.min : Math.min(firstWeekOffset, 0);
  const maxOffset = weekBounds ? weekBounds.max : Math.max(firstWeekOffset, 0);
  const prevDisabled = weekOffset <= minOffset;
  const nextDisabled = weekOffset >= maxOffset;

  const fetchChores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChores(user.username, weekStart);
      setChores(data.chores);
      setCompletions(data.completions);
      setNote(data.note || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.username, weekStart]);

  useEffect(() => {
    fetchChores();
  }, [fetchChores]);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeekBounds() {
      try {
        const weeks = await getWeeks();
        if (!Array.isArray(weeks) || !weeks.length) return;
        const offsets = weeks
          .map(w => getWeekOffsetFromStartDate(w.startDate))
          .filter(o => Number.isFinite(o));
        if (!offsets.length) return;
        if (!cancelled) {
          setWeekBounds({
            min: Math.min(...offsets),
            max: Math.max(...offsets),
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    fetchWeekBounds();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setWeekOffset(o => Math.min(maxOffset, Math.max(minOffset, o)));
  }, [minOffset, maxOffset]);

  async function toggle(choreId, day, ratingType) {
    if (ratingType === 'rating') {
      const current = RATING_VALID.has(completions[day]?.[choreId])
        ? completions[day][choreId]
        : null;
      const idx = RATING_CYCLE.indexOf(current);
      const newVal = RATING_CYCLE[(idx + 1) % RATING_CYCLE.length];
      setCompletions(prev => ({
        ...prev,
        [day]: { ...prev[day], [choreId]: newVal },
      }));
      try {
        await checkChore(user.username, choreId, day, newVal);
      } catch (e) {
        setCompletions(prev => ({
          ...prev,
          [day]: { ...prev[day], [choreId]: current },
        }));
      }
    } else {
      const current = completions[day]?.[choreId] === true;
      const newVal = !current;
      setCompletions(prev => ({
        ...prev,
        [day]: { ...prev[day], [choreId]: newVal },
      }));
      try {
        await checkChore(user.username, choreId, day, newVal);
      } catch (e) {
        setCompletions(prev => ({
          ...prev,
          [day]: { ...prev[day], [choreId]: current },
        }));
      }
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

  const weekNav = (
    <div style={styles.weekNav}>
      <button
        style={{ ...styles.weekNavBtn, ...(prevDisabled ? styles.weekNavBtnDisabled : {}) }}
        onClick={() => setWeekOffset(o => o - 1)}
        disabled={prevDisabled}
        aria-label="Previous week"
      >‹</button>
      <span style={styles.weekLabel}>{humanizeWeekRange(weekDates)}</span>
      <button
        style={{ ...styles.weekNavBtn, ...(nextDisabled ? styles.weekNavBtnDisabled : {}) }}
        onClick={() => setWeekOffset(o => o + 1)}
        disabled={nextDisabled}
        aria-label="Next week"
      >›</button>
    </div>
  );

  if (!chores.length) return (
    <div style={styles.section}>
      {weekNav}
      <div style={styles.empty}>No chores yet! 🎉</div>
    </div>
  );

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>📋 {user.username}'s Chores</div>
      {weekNav}
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
              if (chore.ratingType === 'rating') {
                const rating = RATING_VALID.has(completions[key]?.[chore.id])
                  ? completions[key][chore.id]
                  : null;
                const ratingStyle = rating ? styles[`dayBtn${rating.charAt(0).toUpperCase() + rating.slice(1)}`] : {};
                return (
                  <button
                    key={key}
                    onClick={() => toggle(chore.id, key, 'rating')}
                    style={{
                      ...styles.dayBtn,
                      ...ratingStyle,
                      ...(isToday && !rating ? styles.dayBtnToday : {}),
                    }}
                    title={`${label} — ${rating ? rating.charAt(0).toUpperCase() + rating.slice(1) : 'Not rated'}`}
                  >
                    <span>{label}</span>
                    <span style={styles.check}>{rating ? RATING_ICON[rating] : '○'}</span>
                  </button>
                );
              }
              const done = completions[key]?.[chore.id] === true;
              return (
                <button
                  key={key}
                  onClick={() => toggle(chore.id, key, 'binary')}
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
