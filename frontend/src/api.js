// Small wrapper around fetch for the LifeTrack API.
const TOKEN_KEY = 'lifetrack.token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable: stay signed in for this tab only */ }
}

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields || {}
  }
}

// Called when the server says the token is no longer valid
let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

async function request(method, path, body) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?")
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data?.message || `Something went wrong (${res.status})`, data?.fields)
  }
  return data
}

// Dates are sent as the user's local YYYY-MM-DD, so "today" follows their time zone
export function toISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export const api = {
  signUp: (name, email, password) => request('POST', '/api/auth/signup', { name, email, password }),
  signIn: (email, password) => request('POST', '/api/auth/signin', { email, password }),
  me: () => request('GET', '/api/auth/me'),
  updateProfile: (profile) => request('PUT', '/api/auth/me', profile),
  changePassword: (currentPassword, newPassword) => request('PUT', '/api/auth/password', { currentPassword, newPassword }),

  habits: (date) => request('GET', `/api/habits?date=${date}`),
  createHabit: (date, habit) => request('POST', `/api/habits?date=${date}`, habit),
  updateHabit: (date, id, habit) => request('PUT', `/api/habits/${id}?date=${date}`, habit),
  deleteHabit: (id) => request('DELETE', `/api/habits/${id}`),
  toggleHabit: (date, id) => request('POST', `/api/habits/${id}/toggle?date=${date}`),

  moods: (from, to) => request('GET', `/api/mood?from=${from}&to=${to}`),
  saveMood: (date, score, note) => request('PUT', '/api/mood', { date, score, note }),

  weekly: (date) => request('GET', `/api/stats/weekly?date=${date}`),
  summary: (date) => request('GET', `/api/stats/summary?date=${date}`),
  heatmap: (date, weeks = 26) => request('GET', `/api/stats/heatmap?date=${date}&weeks=${weeks}`),

  rewards: () => request('GET', '/api/rewards'),
  equipReward: (kind, id) => request('PUT', '/api/rewards/equip', { kind, id }),

  friends: () => request('GET', '/api/friends'),
  searchUsers: (q) => request('GET', `/api/friends/search?q=${encodeURIComponent(q)}`),
  addFriend: (target) => request('POST', '/api/friends/requests', target),
  acceptFriend: (friendshipId) => request('POST', `/api/friends/${friendshipId}/accept`),
  removeFriend: (friendshipId) => request('DELETE', `/api/friends/${friendshipId}`),

  groups: (date) => request('GET', `/api/groups?date=${date}`),
  createGroup: (date, group) => request('POST', `/api/groups?date=${date}`, group),
  group: (id, date) => request('GET', `/api/groups/${id}?date=${date}`),
  leaderboard: (id, date, period) => request('GET', `/api/groups/${id}/leaderboard?date=${date}&period=${period}`),
  deleteGroup: (id) => request('DELETE', `/api/groups/${id}`),
  inviteToGroup: (id, userId) => request('POST', `/api/groups/${id}/invites`, { userId }),
  acceptGroup: (id, date) => request('POST', `/api/groups/${id}/accept?date=${date}`),
  leaveGroup: (id) => request('POST', `/api/groups/${id}/leave`),
  postPhoto: (id, date, photo, caption) => request('POST', `/api/groups/${id}/posts?date=${date}`, { photo, caption }),
  deletePost: (postId) => request('DELETE', `/api/groups/posts/${postId}`),
  likePost: (postId) => request('POST', `/api/groups/posts/${postId}/like`),
}
