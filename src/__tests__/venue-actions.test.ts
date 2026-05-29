import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/db", () => ({
  db: {
    venue: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createVenue, importVenues } from "@/modules/venues/actions/venue.actions"

const mockSession = { user: { id: "user-1" } }

describe("createVenue — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns error when name is empty", async () => {
    const fd = new FormData()
    const result = await createVenue({}, fd)
    expect(result.errors?.name).toBeDefined()
    expect(db.venue.create).not.toHaveBeenCalled()
  })

  it("returns error when capacity is negative", async () => {
    const fd = new FormData()
    fd.set("name", "Test Venue")
    fd.set("capacity", "-10")
    const result = await createVenue({}, fd)
    expect(result.errors?.capacity).toBeDefined()
  })

  it("creates venue with valid data", async () => {
    vi.mocked(db.venue.create).mockResolvedValue({ id: "venue-1" } as never)
    const fd = new FormData()
    fd.set("name", "Berghain")
    fd.set("city", "Berlin")
    fd.set("capacity", "1500")
    fd.set("type", "CLUB")
    await createVenue({}, fd).catch(() => {})
    expect(db.venue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Berghain" }) })
    )
  })
})

describe("importVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.venue.createMany).mockResolvedValue({ count: 2 } as never)
  })

  it("filters out rows with empty names", async () => {
    await importVenues([
      { name: "Valid Venue", type: "CLUB" as never },
      { name: "  ", type: "CLUB" as never },
      { name: "", type: "FESTIVAL" as never },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any = vi.mocked(db.venue.createMany).mock.calls[0]?.[0]
    expect(args).toBeDefined()
    const rows = Array.isArray(args.data) ? args.data : [args.data]
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("Valid Venue")
  })

  it("trims whitespace from names", async () => {
    await importVenues([{ name: "  Venue Name  ", type: "THEATER" as never }])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any = vi.mocked(db.venue.createMany).mock.calls[0]?.[0]
    expect(args).toBeDefined()
    const rows = Array.isArray(args.data) ? args.data : [args.data]
    expect(rows[0].name).toBe("Venue Name")
  })

  it("returns count of imported venues", async () => {
    vi.mocked(db.venue.createMany).mockResolvedValue({ count: 3 } as never)
    const result = await importVenues([
      { name: "V1", type: "CLUB" as never },
      { name: "V2", type: "FESTIVAL" as never },
      { name: "V3", type: "SONSTIGE" as never },
    ])
    expect(result.count).toBe(3)
  })
})

describe("authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  it("createVenue returns Nicht autorisiert without session", async () => {
    const fd = new FormData()
    fd.set("name", "Test")
    const result = await createVenue({}, fd)
    expect(result.message).toContain("autorisiert")
  })
})
