// Display info shared by several pages.
export const CATEGORIES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'STUDY', label: 'Study' },
  { value: 'MIND', label: 'Mind' },
  { value: 'MONEY', label: 'Money' },
  { value: 'OTHER', label: 'Other' },
]

export const COLORS = ['#5B4CF0', '#2F80ED', '#1DB176', '#F2994A', '#E5484D', '#D946EF', '#0EA5A4']

export const MOODS = [
  { score: 1, emoji: '😣', label: 'Awful' },
  { score: 2, emoji: '😕', label: 'Bad' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
]

export function moodLabel(score) {
  if (score == null) return '—'
  return MOODS[Math.max(0, Math.min(4, Math.round(score) - 1))].label
}

// Light tint of a hex color for icon backgrounds
export function tint(hex, alpha = 0.14) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

// The Home progress card changes color as the streak grows. `min` is the streak needed to reach each step.
export const STREAK_TIERS = [
  { min: 0, name: 'Purple' },
  { min: 3, name: 'Blue' },
  { min: 7, name: 'Green' },
  { min: 14, name: 'Gold' },
  { min: 30, name: 'Fire' },
  { min: 60, name: 'Legend' },
  { min: 100, name: 'Diamond' },
  { min: 200, name: 'Cosmic' },
  { min: 365, name: 'Eternal' },
]

/** Which step a streak is on (0 to 8), and how many more days until the next one (null at the top). */
export function streakTier(streak) {
  let level = 0
  STREAK_TIERS.forEach((t, i) => { if (streak >= t.min) level = i })
  const next = STREAK_TIERS[level + 1]
  return { level, name: STREAK_TIERS[level].name, next, daysToNext: next ? next.min - streak : null }
}

// Group streaks are harder (everyone must post), so they level up sooner and use their own metals-and-gems look.
export const GROUP_TIERS = [
  { min: 0, name: 'Starter' },
  { min: 2, name: 'Bronze' },
  { min: 5, name: 'Silver' },
  { min: 10, name: 'Gold' },
  { min: 21, name: 'Platinum' },
  { min: 40, name: 'Ruby' },
  { min: 75, name: 'Emerald' },
  { min: 120, name: 'Sapphire' },
  { min: 200, name: 'Champions' },
]

export function groupTier(streak) {
  let level = 0
  GROUP_TIERS.forEach((t, i) => { if (streak >= t.min) level = i })
  const next = GROUP_TIERS[level + 1]
  return { level, name: GROUP_TIERS[level].name, next, daysToNext: next ? next.min - streak : null }
}
