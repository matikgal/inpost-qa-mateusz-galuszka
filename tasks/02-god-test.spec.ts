import { test, expect, APIRequestContext } from '@playwright/test'

/**
 * TASK 02 — Refactor
 *
 * Problems in the original "god test":
 * 1. Single test does too much — create, update, status change, delete are all coupled.
 *    If create fails, all assertions below are meaningless.
 * 2. No Page Object / helper — token and baseURL are hardcoded inline 4 times.
 * 3. No descriptive test names — "parcel lifecycle" tells you nothing about what's asserted.
 * 4. Tests are not independent — each step depends on the previous step's side-effects.
 * 5. Response bodies are not validated beyond status codes.
 * 6. No cleanup — a failing test leaves orphan parcels in the store.
 */

const TOKEN = 'test-token-inpost-2026'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders() {
  return { Authorization: `Bearer ${TOKEN}` }
}

async function createParcel(request: APIRequestContext) {
  const res = await request.post('/api/parcels', {
    headers: authHeaders(),
    data: {
      recipientName: 'Jan Kowalski',
      recipientEmail: 'jan@example.com',
      size: 'A',
      deliveryType: 'LOCKER',
      lockerCode: 'KRK001',
    },
  })
  expect(res.status()).toBe(201)
  return res.json()
}

async function deleteParcel(request: APIRequestContext, id: string) {
  await request.delete(`/api/parcels/${id}`, { headers: authHeaders() })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('POST /api/parcels — create parcel', () => {
  test('should return 201 and a parcel object with id', async ({ request }) => {
    const parcel = await createParcel(request)

    expect(parcel).toHaveProperty('id')
    expect(parcel.recipientName).toBe('Jan Kowalski')
    expect(parcel.recipientEmail).toBe('jan@example.com')
    expect(parcel.size).toBe('A')
    expect(parcel.deliveryType).toBe('LOCKER')

    await deleteParcel(request, parcel.id)
  })

  test('should return 401 when no authorization header is provided', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      data: {
        recipientName: 'Jan Kowalski',
        recipientEmail: 'jan@example.com',
        size: 'A',
        deliveryType: 'LOCKER',
        lockerCode: 'KRK001',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('should return 400 when required fields are missing', async ({ request }) => {
    const res = await request.post('/api/parcels', {
      headers: authHeaders(),
      data: { recipientName: 'Jan Kowalski' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('PATCH /api/parcels/:id — update parcel notes', () => {
  test('should return 200 and updated parcel with new notes', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      headers: authHeaders(),
      data: { notes: 'Leave at the door' },
    })

    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.notes).toBe('Leave at the door')

    await deleteParcel(request, parcel.id)
  })

  test('should return 404 when parcel id does not exist', async ({ request }) => {
    const res = await request.patch('/api/parcels/nonexistent-id', {
      headers: authHeaders(),
      data: { notes: 'test' },
    })
    expect(res.status()).toBe(404)
  })

  test('should return 401 when no authorization header is provided', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}`, {
      data: { notes: 'test' },
    })
    expect(res.status()).toBe(401)

    await deleteParcel(request, parcel.id)
  })
})

test.describe('PATCH /api/parcels/:id/status — transition parcel status', () => {
  test('should transition from CREATED to IN_TRANSIT and return 200', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: authHeaders(),
      data: { status: 'IN_TRANSIT' },
    })

    expect(res.status()).toBe(200)
    const updated = await res.json()
    expect(updated.status).toBe('IN_TRANSIT')

    await deleteParcel(request, parcel.id)
  })

  test('should return 400 for invalid status transition', async ({ request }) => {
    const parcel = await createParcel(request)

    // Cannot go CREATED → DELIVERED directly
    const res = await request.patch(`/api/parcels/${parcel.id}/status`, {
      headers: authHeaders(),
      data: { status: 'DELIVERED' },
    })
    expect(res.status()).toBe(400)

    await deleteParcel(request, parcel.id)
  })
})

test.describe('DELETE /api/parcels/:id — delete parcel', () => {
  test('should return 204 when deleting an existing parcel', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.delete(`/api/parcels/${parcel.id}`, {
      headers: authHeaders(),
    })
    expect(res.status()).toBe(204)
  })

  test('should return 404 when deleting a non-existent parcel', async ({ request }) => {
    const res = await request.delete('/api/parcels/nonexistent-id', {
      headers: authHeaders(),
    })
    expect(res.status()).toBe(404)
  })

  test('should return 401 when no authorization header is provided', async ({ request }) => {
    const parcel = await createParcel(request)

    const res = await request.delete(`/api/parcels/${parcel.id}`)
    expect(res.status()).toBe(401)

    await deleteParcel(request, parcel.id)
  })
})
