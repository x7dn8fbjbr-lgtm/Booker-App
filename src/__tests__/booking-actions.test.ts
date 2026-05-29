import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
  },
}))

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
} from "@/modules/bookings/actions/booking.actions"

const mockSession = { user: { id: "user-1", email: "test@example.com" } }

// ─── buildDateTime (via createBooking) ───────────────────────────────────────

describe("createBooking — buildDateTime UTC", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
    vi.mocked(db.booking.create).mockResolvedValue({ id: "booking-1" } as never)
  })

  it("stores time with Z suffix (UTC) when time is provided", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("time", "20:00")
    fd.set("status", "ERSTKONTAKT")

    await createBooking({}, fd).catch(() => {}) // redirect throws — catch it

    const call = vi.mocked(db.booking.create).mock.calls[0][0]
    const stored = call.data.date as Date
    expect(stored.toISOString()).toBe("2026-06-15T20:00:00.000Z")
  })

  it("stores midnight UTC when no time is provided", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    await createBooking({}, fd).catch(() => {})

    const call = vi.mocked(db.booking.create).mock.calls[0][0]
    const stored = call.data.date as Date
    expect(stored.toISOString()).toBe("2026-06-15T00:00:00.000Z")
  })
})

// ─── Validation ───────────────────────────────────────────────────────────────

describe("createBooking — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns field errors when artistId is missing", async () => {
    const fd = new FormData()
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    const result = await createBooking({}, fd)
    expect(result.errors?.artistId).toBeDefined()
    expect(db.booking.create).not.toHaveBeenCalled()
  })

  it("returns field errors when venueId is missing", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    const result = await createBooking({}, fd)
    expect(result.errors?.venueId).toBeDefined()
    expect(db.booking.create).not.toHaveBeenCalled()
  })

  it("returns field errors when date is missing", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("status", "ERSTKONTAKT")

    const result = await createBooking({}, fd)
    expect(result.errors?.date).toBeDefined()
  })

  it("returns message on DB error", async () => {
    vi.mocked(db.booking.create).mockRejectedValue(new Error("DB down"))
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    const result = await createBooking({}, fd)
    expect(result.message).toContain("fehlgeschlagen")
  })
})

// ─── Authorization ─────────────────────────────────────────────────────────────

describe("authorization — session required for mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  it("createBooking returns 'Nicht autorisiert' without session", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    const result = await createBooking({}, fd)
    expect(result.message).toContain("autorisiert")
    expect(db.booking.create).not.toHaveBeenCalled()
  })

  it("updateBooking returns 'Nicht autorisiert' without session", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("venueId", "venue-1")
    fd.set("date", "2026-06-15")
    fd.set("status", "ERSTKONTAKT")

    const result = await updateBooking("booking-1", {}, fd)
    expect(result.message).toContain("autorisiert")
    expect(db.booking.update).not.toHaveBeenCalled()
  })

  it("updateBookingStatus returns { success: false } without session", async () => {
    const result = await updateBookingStatus("booking-1", "BESTAETIGT" as never)
    expect(result.success).toBe(false)
    expect(result.message).toContain("autorisiert")
  })

  it("deleteBooking redirects to /login without session", async () => {
    await deleteBooking("booking-1").catch(() => {})
    expect(redirect).toHaveBeenCalledWith("/login")
    expect(db.booking.delete).not.toHaveBeenCalled()
  })
})

// ─── updateBookingStatus ──────────────────────────────────────────────────────

describe("updateBookingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns success: true on DB success", async () => {
    vi.mocked(db.booking.update).mockResolvedValue({} as never)
    const result = await updateBookingStatus("booking-1", "BESTAETIGT" as never)
    expect(result.success).toBe(true)
  })

  it("returns success: false on DB error", async () => {
    vi.mocked(db.booking.update).mockRejectedValue(new Error("DB error"))
    const result = await updateBookingStatus("booking-1", "BESTAETIGT" as never)
    expect(result.success).toBe(false)
    expect(result.message).toBeDefined()
  })
})
