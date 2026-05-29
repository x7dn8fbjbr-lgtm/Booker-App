import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/db", () => ({
  db: {
    tour: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    booking: { update: vi.fn(), findMany: vi.fn() },
  },
}))

import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createTour, addBookingToTour, removeBookingFromTour } from "@/modules/tours/actions/tour.actions"

const mockSession = { user: { id: "user-1" } }

describe("createTour — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns error when name is empty", async () => {
    const fd = new FormData()
    fd.set("artistId", "artist-1")
    fd.set("startDate", "2026-06-01")
    fd.set("endDate", "2026-06-10")
    const result = await createTour({}, fd)
    expect(result.errors?.name).toBeDefined()
  })

  it("returns error when endDate is before startDate", async () => {
    const fd = new FormData()
    fd.set("name", "Summer Tour")
    fd.set("artistId", "artist-1")
    fd.set("startDate", "2026-06-10")
    fd.set("endDate", "2026-06-01") // before start
    const result = await createTour({}, fd)
    expect(result.errors?.endDate).toBeDefined()
  })

  it("creates tour with valid data", async () => {
    vi.mocked(db.tour.create).mockResolvedValue({ id: "tour-1" } as never)
    const fd = new FormData()
    fd.set("name", "Summer Tour")
    fd.set("artistId", "artist-1")
    fd.set("startDate", "2026-06-01")
    fd.set("endDate", "2026-06-30")
    await createTour({}, fd).catch(() => {})
    expect(db.tour.create).toHaveBeenCalled()
  })
})

describe("addBookingToTour / removeBookingFromTour", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns success: true when booking is added", async () => {
    vi.mocked(db.booking.update).mockResolvedValue({} as never)
    const result = await addBookingToTour("tour-1", "booking-1")
    expect(result.success).toBe(true)
  })

  it("returns success: false on DB error", async () => {
    vi.mocked(db.booking.update).mockRejectedValue(new Error("DB error"))
    const result = await addBookingToTour("tour-1", "booking-1")
    expect(result.success).toBe(false)
  })

  it("removeBookingFromTour sets tourId to null", async () => {
    vi.mocked(db.booking.update).mockResolvedValue({} as never)
    await removeBookingFromTour("tour-1", "booking-1")
    expect(db.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tourId: null } })
    )
  })
})

describe("authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  it("createTour returns Nicht autorisiert without session", async () => {
    const fd = new FormData()
    fd.set("name", "Tour")
    fd.set("artistId", "a1")
    fd.set("startDate", "2026-06-01")
    fd.set("endDate", "2026-06-30")
    const result = await createTour({}, fd)
    expect(result.message).toContain("autorisiert")
  })
})
