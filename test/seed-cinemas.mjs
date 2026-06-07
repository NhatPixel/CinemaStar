/**
 * Tạo 20 rạp gán cho một manager.
 *
 * node test/seed-cinemas.mjs
 *
 * Tuỳ chọn: API_BASE_URL, AUTH_COOKIE, MANAGER_ID, SEED_COUNT, SEED_TAG
 */

const AUTH_COOKIE = String(
  process.env.AUTH_COOKIE ||
    'accessToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoiYWNjZXNzIiwidXNlcklkIjoiMDE5ZDhjNzEtZTZhMS03ZTA3LTkyMzMtMzY2YmZiNjAxZTRkIiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3ODA1NTU2MjQsImV4cCI6MTc4Mjk1NTYyNH0.6HYm3rjPg2GaHO5sfBByu3SNmK1-m618ODOmSlXtZEc; refreshToken=eyJhbGciOiJIUzI1NiJ9.eyJ0b2tlbklkIjoiNDk1YzRmMWEtODliOS00Zjc4LThlODItYWNlNTc1ODFjMDk2IiwidG9rZW5UeXBlIjoicmVmcmVzaCIsInVzZXJJZCI6IjAxOWQ4YzcxLWU2YTEtN2UwNy05MjMzLTM2NmJmYjYwMWU0ZCIsImF1dGhvcml0aWVzIjpbIlJPTEVfQURNSU4iXSwic3ViIjoiYWRtaW5AZ21haWwuY29tIiwiaWF0IjoxNzgwNTU1NjI0LCJleHAiOjE3ODMxNDc2MjR9.QNjo4UbmNkcSJpiVAGE7uyF-YZwyJVgVsv9d9Neq3f0',
).trim()

const MANAGER_ID =
  process.env.MANAGER_ID || '019e335d-d3a6-7916-b151-b32f6fe41fa4'
const API_BASE_URL = (
  process.env.API_BASE_URL || 'https://cinema-api.duckdns.org/api'
).replace(/\/+$/, '')
const SEED_COUNT = Math.max(1, Number(process.env.SEED_COUNT) || 20)
const SEED_TAG = String(process.env.SEED_TAG || Date.now()).replace(/\W/g, '')

const DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 7',
  'Thủ Đức',
  'Bình Thạnh',
  'Tân Bình',
  'Phú Nhuận',
  'Gò Vấp',
  'Hai Bà Trưng',
  'Tân Phú',
  'Quận 10',
  'Quận 12',
  'Bình Tân',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 8',
  'Quận 11',
  'Nhà Bè',
  'Củ Chi',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildCinemaPayload(index) {
  const i = pad(index)
  const district = DISTRICTS[(index - 1) % DISTRICTS.length]
  const lat = 10.75 + index * 0.008
  const lng = 106.65 + index * 0.008
  const phone = `09${String(10000000 + index).slice(-8)}`
  return {
    code: `CS-${SEED_TAG.slice(-8)}-${i}`,
    name: `CinemaStar ${district}`,
    address: `${120 + index} Duong Seed, ${district}, TP.HCM`,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    phone,
    openTime: '08:00:00',
    closeTime: '23:00:00',
    status: 'ACTIVE',
    managerId: MANAGER_ID,
  }
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: AUTH_COOKIE,
    },
    body: JSON.stringify(body),
  })

  let payload = null
  const text = await response.text()
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }
  return { response, payload }
}

async function createCinema(index) {
  const body = buildCinemaPayload(index)
  let { response, payload } = await apiPost('/cinemas', body)
  let ok = response.ok && payload?.success !== false
  let note = ''

  if (!ok && response.status === 500 && body.managerId) {
    const retry = { ...body, managerId: undefined }
    ;({ response, payload } = await apiPost('/cinemas', retry))
    ok = response.ok && payload?.success !== false
    if (ok) note = ' (không gán manager — manager có thể đã có rạp / DB giới hạn 1 rạp/manager)'
  }

  console.log(
    `[${ok ? 'OK' : 'FAIL'}] #${pad(index)} ${body.code} — ${payload?.message || response.statusText}${note}`,
  )
  if (!ok && payload) console.error('  ', JSON.stringify(payload))
  return ok
}

async function main() {
  if (!AUTH_COOKIE) {
    console.error('Thiếu AUTH_COOKIE')
    process.exitCode = 1
    return
  }

  console.log(`API: ${API_BASE_URL}`)
  console.log(`Manager: ${MANAGER_ID}`)
  console.log(`Tạo ${SEED_COUNT} rạp (tag: ${SEED_TAG})\n`)

  let ok = 0
  let fail = 0
  for (let i = 1; i <= SEED_COUNT; i += 1) {
    if (await createCinema(i)) ok += 1
    else fail += 1
  }

  console.log(`\nXong: ${ok} OK, ${fail} FAIL`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
