import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

export function login(username, password) {
  return axios.post(`${BASE}/api/login`, { username, password }).then(r => r.data);
}

export function getChores(username, weekStart) {
  const params = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
  return axios.get(`${BASE}/api/chores/${username}${params}`).then(r => r.data);
}

export function checkChore(username, choreId, day, completed) {
  return axios
    .post(`${BASE}/api/chores/${username}/check`, { choreId, day, completed })
    .then(r => r.data);
}

export function getUsers() {
  return axios.get(`${BASE}/api/users`).then(r => r.data);
}

export function updateChoreList(username, chores) {
  return axios
    .post(`${BASE}/api/chores/${username}/list`, { chores })
    .then(r => r.data);
}

export function saveNote(username, note) {
  return axios
    .post(`${BASE}/api/notes/${username}`, { note })
    .then(r => r.data);
}

export function resetWeek(username, password) {
  return axios.post(`${BASE}/api/reset`, { username, password }).then(r => r.data);
}

export function getWeeks() {
  return axios.get(`${BASE}/api/weeks`).then(r => r.data);
}

export function createWeek(username, password, startDate) {
  return axios
    .post(`${BASE}/api/weeks`, { username, password, startDate })
    .then(r => r.data);
}

export function freezeWeek(username, password, weekStart) {
  return axios
    .post(`${BASE}/api/weeks/${weekStart}/freeze`, { username, password })
    .then(r => r.data);
}
