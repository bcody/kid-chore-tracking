import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

export function login(username, password) {
  return axios.post(`${BASE}/api/login`, { username, password }).then(r => r.data);
}

export function getChores(username) {
  return axios.get(`${BASE}/api/chores/${username}`).then(r => r.data);
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
