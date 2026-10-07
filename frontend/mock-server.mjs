// A stand-in for the Spring Boot backend, for trying the UI without Java.
// Same endpoints and JSON as the real API, but data lives in memory and is lost on restart.
//   npm run mock            -> empty
//   npm run mock -- --demo  -> adds demo@lifetrack.app / password123 with 6 weeks of history
import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT || 8080)
const db = { users: [], habits: [], checkIns: [], moods: [], tokens: new Map(), ids: 1 }
const nextId = () => db.ids++

// ---------- helpers ----------
const iso = (d) => d.toISOString().slice(0, 10)
const parse = (s) => new Date(`${s}T00:00:00Z`)
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime())
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`
const verify = (pw, stored) => { const [salt] = stored.split(':'); return hash(pw, salt) === stored }

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields }
}
const fail = (status, message, fields) => { throw new HttpError(status, message, fields) }

function currentStreak(days, today) {
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}
function longestStreak(days) {
  let best = 0, run = 0, prev = null
  for (const d of [...days].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run); prev = d
  }
  return best
}

const userDto = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })

function habitView(h, day) {
  const done = new Set(db.checkIns.filter((c) => c.habitId === h.id && c.date <= day).map((c) => c.date))
  const last7 = Array.from({ length: 7 }, (_, i) => done.has(addDays(day, i - 6)))
  return { id: h.id, name: h.name, category: h.category, color: h.color, goal: h.goal,
    doneToday: done.has(day), last7, streak: currentStreak(done, day) }
}

function validateHabit(b) {
  const fields = {}
  if (!b.name || !String(b.name).trim()) fields.name = 'Please give the habit a name'
  else if (b.name.length > 60) fields.name = 'Name is too long'
  if (!['HEALTH', 'STUDY', 'MIND', 'MONEY', 'OTHER'].includes(b.category)) fields.category = 'Please choose a category'
  if (!/^#[0-9A-Fa-f]{6}$/.test(b.color || '')) fields.color = 'Color must look like #5B4CF0'
  if (b.goal && b.goal.length > 60) fields.goal = 'Goal is too long'
  if (Object.keys(fields).length) fail(400, 'Please check the highlighted fields', fields)
  return { name: b.name.trim(), category: b.category, color: b.color.toUpperCase(), goal: b.goal?.trim() || null }
}

function needDate(q, key = 'date') {
  if (!isDate(q.get(key))) fail(400, 'Invalid request')
  return q.get(key)
}

// ---------- routes ----------
function route(method, path, q, body, userId) {
  const auth = () => userId ?? fail(401, 'Please sign in')

  if (method === 'POST' && path === '/api/auth/signup') {
    const fields = {}
    const email = String(body.email || '').trim().toLowerCase()
    if (!body.name || !String(body.name).trim()) fields.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(email)) fields.email = 'Please enter a valid email'
    if (!body.password || body.password.length < 8 || body.password.length > 72) fields.password = 'Password must be 8 to 72 characters'
    if (Object.keys(fields).length) fail(400, 'Please check the highlighted fields', fields)
    if (db.users.some((u) => u.email === email)) fail(409, 'An account with this email already exists')
    const user = { id: nextId(), name: body.name.trim(), email, passwordHash: hash(body.password), createdAt: new Date().toISOString() }
    db.users.push(user)
    return [201, issue(user)]
  }
  if (method === 'POST' && path === '/api/auth/signin') {
    const user = db.users.find((u) => u.email === String(body.email || '').trim().toLowerCase())
    if (!user || !verify(String(body.password || ''), user.passwordHash)) fail(401, 'Email or password is incorrect')
    return [200, issue(user)]
  }
  if (method === 'GET' && path === '/api/auth/me') {
    const u = db.users.find((x) => x.id === auth()) ?? fail(401, 'Please sign in')
    return [200, userDto(u)]
  }

  if (path === '/api/habits') {
    const uid = auth(); const day = needDate(q)
    if (method === 'GET') return [200, db.habits.filter((h) => h.userId === uid).map((h) => habitView(h, day))]
    if (method === 'POST') {
      const h = { id: nextId(), userId: uid, ...validateHabit(body), createdAt: Date.now() }
      db.habits.push(h)
      return [201, habitView(h, day)]
    }
  }
  let m = path.match(/^\/api\/habits\/(\d+)(\/toggle)?$/)
  if (m) {
    const uid = auth()
    const h = db.habits.find((x) => x.id === Number(m[1]) && x.userId === uid) ?? fail(404, 'Habit not found')
    if (m[2] && method === 'POST') {
      const day = needDate(q)
      if (day > addDays(iso(new Date()), 1)) fail(400, "You can't check off a future day")
      const i = db.checkIns.findIndex((c) => c.habitId === h.id && c.date === day)
      if (i >= 0) db.checkIns.splice(i, 1)
      else db.checkIns.push({ id: nextId(), habitId: h.id, userId: uid, date: day })
      return [200, habitView(h, day)]
    }
    if (!m[2] && method === 'PUT') { Object.assign(h, validateHabit(body)); return [200, habitView(h, needDate(q))] }
    if (!m[2] && method === 'DELETE') {
      db.checkIns = db.checkIns.filter((c) => c.habitId !== h.id)
      db.habits = db.habits.filter((x) => x.id !== h.id)
      return [204, null]
    }
  }

  if (path === '/api/mood') {
    const uid = auth()
    if (method === 'GET') {
      const from = needDate(q, 'from'); const to = needDate(q, 'to')
      return [200, db.moods.filter((x) => x.userId === uid && x.date >= from && x.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date)).map(({ date, score, note }) => ({ date, score, note }))]
    }
    if (method === 'PUT') {
      if (!isDate(body.date)) fail(400, 'Please check the highlighted fields', { date: 'Please pick a date' })
      if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) fail(400, 'Please check the highlighted fields', { score: 'Mood must be 1 to 5' })
      if (body.note && body.note.length > 280) fail(400, 'Please check the highlighted fields', { note: 'Note can be up to 280 characters' })
      let e = db.moods.find((x) => x.userId === uid && x.date === body.date)
      if (!e) { e = { userId: uid, date: body.date }; db.moods.push(e) }
      e.score = body.score; e.note = body.note?.trim() || null
      return [200, { date: e.date, score: e.score, note: e.note }]
    }
  }

  if (method === 'GET' && path === '/api/stats/weekly') {
    const uid = auth(); const end = needDate(q)
    const total = db.habits.filter((h) => h.userId === uid).length
    const count = (d) => db.checkIns.filter((c) => c.userId === uid && c.date === d).length
    const days = []; let week = 0; let prev = 0
    for (let i = 13; i >= 0; i--) {
      const d = addDays(end, -i); const n = count(d)
      if (i >= 7) prev += n
      else {
        week += n
        days.push({ date: d, completed: n, total, mood: db.moods.find((x) => x.userId === uid && x.date === d)?.score ?? null })
      }
    }
    const moods = days.filter((d) => d.mood != null).map((d) => d.mood)
    const pct = (a) => (total ? Math.round((100 * a) / (total * 7)) : 0)
    return [200, { days, completionRate: pct(week), previousRate: pct(prev),
      averageMood: moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null, checkIns: week }]
  }
  if (method === 'GET' && path === '/api/stats/summary') {
    const uid = auth(); const today = needDate(q)
    const days = new Set(db.checkIns.filter((c) => c.userId === uid).map((c) => c.date))
    const u = db.users.find((x) => x.id === uid)
    return [200, { currentStreak: currentStreak(days, today), longestStreak: longestStreak(days),
      activeHabits: db.habits.filter((h) => h.userId === uid).length,
      totalCheckIns: db.checkIns.filter((c) => c.userId === uid).length, memberSince: u.createdAt }]
  }
  if (method === 'GET' && path === '/api/stats/heatmap') {
    const uid = auth(); const end = needDate(q); const weeks = Number(q.get('weeks') || 26)
    if (!(weeks >= 1 && weeks <= 53)) fail(400, 'weeks must be between 1 and 53')
    const out = []
    for (let d = addDays(end, -(weeks * 7 - 1)); d <= end; d = addDays(d, 1)) {
      out.push({ date: d, count: db.checkIns.filter((c) => c.userId === uid && c.date === d).length })
    }
    return [200, out]
  }

  fail(404, 'Not found')
}

function issue(user) {
  const token = crypto.randomBytes(24).toString('hex')
  db.tokens.set(token, user.id)
  return { token, user: userDto(user) }
}

// ---------- server ----------
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let body = {}
  try {
    const chunks = []
    for await (const c of req) chunks.push(c)
    if (chunks.length) body = JSON.parse(Buffer.concat(chunks).toString())
  } catch { body = null }

  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  const userId = db.tokens.get(token)
  try {
    if (body === null) fail(400, 'Invalid request')
    const [status, data] = route(req.method, url.pathname, url.searchParams, body, userId)
    res.writeHead(status, data === null ? {} : { 'Content-Type': 'application/json' })
    res.end(data === null ? undefined : JSON.stringify(data))
  } catch (e) {
    const status = e.status || 500
    if (status === 500) console.error(e)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: e.status ? e.message : 'Server error', ...(e.fields ? { fields: e.fields } : {}) }))
  }
}).listen(PORT, () => console.log(`Mock LifeTrack API on http://localhost:${PORT}`))

// ---------- demo data ----------
if (process.argv.includes('--demo')) {
  const today = iso(new Date())
  const user = { id: nextId(), name: 'Htet Myat', email: 'demo@lifetrack.app', passwordHash: hash('password123'),
    createdAt: new Date(Date.now() - 45 * 864e5).toISOString() }
  db.users.push(user)
  const habits = [
    ['Morning meditation', 'MIND', '#F2994A', '10 min', 0.75],
    ['Study Java', 'STUDY', '#2F80ED', '45 min', 0.8],
    ['Evening run', 'HEALTH', '#1DB176', '3 km', 0.5],
    ['Drink water', 'HEALTH', '#0EA5A4', '8 cups', 0.85],
    ['Read 20 pages', 'STUDY', '#D946EF', '20 pages', 0.6],
    ['Save ¥1,000', 'MONEY', '#5B4CF0', null, 0.65],
  ].map(([name, category, color, goal, rate]) => {
    const h = { id: nextId(), userId: user.id, name, category, color, goal, createdAt: Date.now() }
    db.habits.push(h)
    return [h, rate]
  })
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 42; i >= 1; i--) {
    const d = addDays(today, -i)
    const boost = i < 14 ? 0.1 : 0
    let done = 0
    for (const [h, rate] of habits) {
      if (rnd() < rate + boost) { db.checkIns.push({ id: nextId(), habitId: h.id, userId: user.id, date: d }); done++ }
    }
    if (i <= 20 && rnd() < 0.85) {
      const score = Math.max(1, Math.min(5, Math.round(1.5 + (done / habits.length) * 3.2 + (rnd() - 0.5))))
      db.moods.push({ userId: user.id, date: d, score, note: i === 1 ? 'Finished the Spring Boot tutorial!' : i === 3 ? 'Tired after part-time job' : null })
    }
  }
  // Today: a few done already
  for (const [h] of habits.slice(0, 3)) db.checkIns.push({ id: nextId(), habitId: h.id, userId: user.id, date: today })
  console.log('Demo user: demo@lifetrack.app / password123')
}
