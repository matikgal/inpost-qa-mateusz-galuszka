import { test, expect, APIRequestContext } from '@playwright/test'

/**
 * TASK 06 — API testing
 *
 * Documentation: http://localhost:3000/challenges/api-testing
 * Auth token: test-token-inpost-2026
 *
 * Endpoints tested:
 *   POST   /api/parcels             — create parcel
 *   GET    /api/parcels/:id         — get parcel
 *   PATCH  /api/parcels/:id         — update parcel fields
 *   PATCH  /api/parcels/:id/status  — transition parcel status
 *   DELETE /api/parcels/:id         — delete parcel
 */

const TOKEN = 'test-token-inpost-2026'

function auth() {
  return { Authorization: `Bearer ${TOKEN}` }
}

const VALID_LOCKER_PAYLOAD = {
  recipientName: 'Anna Nowak',
  recipientEmail: 'anna@example.com',
  size: 'B',
  deliveryType: 'LOCKER',
  lockerCode: 'WAW001',
}

const VALID_HOME_PAYLOAD = {
  recipientName: 'Piotr Wiśniewski',
  recipientEmail: 'piotr@example.com',
  size: 'C',
  deliveryType: 'HOME',
  address: {
    street: 'ul. Marszałkowska 1',
    city: 'Warszawa',
    postcode: '00-001',
    country: 'PL',
  },
}

async function createParcel(request: APIRequestContext, data = VALID_LOCKER_PAYLOAD) {
  const res = await request.post('/api/parcels', { headers: auth(), data })
  expect(res.status()).toBe(201)
  return res.json()
}

async function cleanup(request: APIRequestContext, id: string) {
  await request.delete(`/api/parcels/${id}`, { headers: auth() })
}

// ---------------------------------------------------------------------------
// Version A — Recruitment: POST /api/parcels
// ---------------------------------------------------------------------------

test.describe('POST /api/parcels', () => {
  test('should create a locker parcel and return 201 with parcel object', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: auth(),
      data: VALID_LOCKER_PAYLOAD,
    })

    expect(res.status()).toBe(201)
    const body = await res.json()

    // Schema validation
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('trackingNumber')
    expect(body).toHaveProperty('status', 'CREATED')
    expect(body.recipientName).toBe('Anna Nowak')
    expect(body.recipientEmail).toBe('anna@example.com')
    expect(body.size).toBe('B')
    expect(body.deliveryType).toBe('LOCKER')
    expect(body.lockerCode).toBe('WAW001')
    expect(body).toHaveProperty('createdAt')
    expect(body).toHaveProperty('updatedAt')

    await cleanup(request, body.id)
  })

  test('should create a home delivery parcel and return 201', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: auth(),
      data: VALID_HOME_PAYLOAD,
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.deliveryType).toBe('HOME')
    expect(body.address).toBeDefined()

    await cleanup(request, body.id)
  })

  test('should return 401 when Authorization header is missing', async ({ request }) => {
    const res = await request.post('/api/parcels', { data: VALID_LOCKER_PAYLOAD })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('should return 401 when Authorization token is wrong', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: { Authorization: 'Bearer wrong-token' },
      data: VALID_LOCKER_PAYLOAD,
    })
    expect(res.status()).toBe(401)
  })

  test('should return 400 when recipientName is missing', async ({ request }) => {
    const { recipientName, ...payload } = VALID_LOCKER_PAYLOAD
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('should return 400 when recipientEmail is missing', async ({ request }) => {
    const { recipientEmail, ...payload } = VALID_LOCKER_PAYLOAD
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
  })

  test('should return 400 when size is missing', async ({ request }) => {
    const { size, ...payload } = VALID_LOCKER_PAYLOAD
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
  })

  test('should return 400 when deliveryType is missing', async ({ request }) => {
    const { deliveryType, ...payload } = VALID_LOCKER_PAYLOAD
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
  })

  test('should return 400 when LOCKER deliveryType has no lockerCode', async ({ request }) => {
    const { lockerCode, ...payload } = VALID_LOCKER_PAYLOAD
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
  })

  test('should return 400 when HOME deliveryType has no address', async ({ request }) => {
    const payload = { ...VALID_HOME_PAYLOAD }
    delete (payload as any).address
    const res = await request.post('/api/parcels', { headers: auth(), data: payload })
    expect(res.status()).toBe(400)
  })

  test('should return 400 for invalid size value', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: auth(),
      data: { ...VALID_LOCKER_PAYLOAD, size: 'Z' },
    })
    expect(res.status()).toBe(400)
  })

  test('should return 400 for invalid deliveryType value', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: auth(),
      data: { ...VALID_LOCKER_PAYLOAD, deliveryType: 'DRONE' },
    })
    expect(res.status()).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Version B — Internship: full update flow
// ---------------------------------------------------------------------------

test.describe('PATCH /api/parcels — update flow', () => {
  test('should update parcel notes and return 200 with updated data', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      headers: auth(),
      data: { notes: 'Handle with care' },
    })

    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.notes).toBe('Handle with care')
    expect(updated.id).toBe(parcel.id)

    await cleanup(request, parcel.id)
  })

  test('should update phone number and return 200', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      headers: auth(),
      data: { phoneNumber: '+48123456789' },
    })
    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.phoneNumber).toBe('+48123456789')

    await cleanup(request, parcel.id)
  })

  test('should return 401 when Authorization header is missing', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      data: { notes: 'No auth' },
    })
    expect(res.status()).toBe(401)

    await cleanup(request, parcel.id)
  })

  test('should return 404 when parcel does not exist', async ({ request }) => {
    const res = await request.patch('/api/parcels/does-not-exist', {
      headers: auth(),
      data: { notes: 'Ghost parcel' },
    })
    expect(res.status()).toBe(404)
  })

  test('should transition CREATED → IN_TRANSIT and return updated status', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'IN_TRANSIT' },
    })
    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.status).toBe('IN_TRANSIT')

    await cleanup(request, parcel.id)
  })

  test('should transition IN_TRANSIT → DELIVERED', async ({ request }) => {
    const parcel = await createParcel(request)

    await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'IN_TRANSIT' },
    })

    const res = await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'DELIVERED' },
    })
    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.status).toBe('DELIVERED')

    await cleanup(request, parcel.id)
  })

  test('should return 400 for invalid status transition CREATED → DELIVERED', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'DELIVERED' },
    })
    expect(res.status()).toBe(400)

    await cleanup(request, parcel.id)
  })

  test('should return 409 when updating a parcel in terminal DELIVERED status', async ({ request }) => {
    const parcel = await createParcel(request)

    // Transition to terminal state
    await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'IN_TRANSIT' },
    })
    await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: auth(),
      data: { status: 'DELIVERED' },
    })

    // Attempt to update fields on a DELIVERED parcel — should return 409
    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      headers: auth(),
      data: { notes: 'Too late' },
    })
    expect(res.status()).toBe(409)

    await cleanup(request, parcel.id)
  })

  test('should return 200 for GET /api/parcels/:id after creation', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.get(`/api/parcels/${parcel.id}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(parcel.id)

    await cleanup(request, parcel.id)
  })

  test('should return 404 for GET /api/parcels/:id with nonexistent id', async ({ request }) => {
    const res = await request.get('/api/parcels/nonexistent-0000')
    expect(res.status()).toBe(404)
  })
})
