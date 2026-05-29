import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/db", () => ({
  db: {
    artist: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createArtist, updateArtist, deleteArtist } from "@/modules/artists/actions/artist.actions"

const mockSession = { user: { id: "user-1" } }

describe("createArtist — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("returns error when name is empty", async () => {
    const fd = new FormData()
    const result = await createArtist({}, fd)
    expect(result.errors?.name).toBeDefined()
    expect(db.artist.create).not.toHaveBeenCalled()
  })

  it("rejects invalid email", async () => {
    const fd = new FormData()
    fd.set("name", "Test Artist")
    fd.set("email", "not-an-email")
    const result = await createArtist({}, fd)
    expect(result.errors?.email).toBeDefined()
  })

  it("rejects invalid website URL", async () => {
    const fd = new FormData()
    fd.set("name", "Test Artist")
    fd.set("website", "not-a-url")
    const result = await createArtist({}, fd)
    expect(result.errors?.website).toBeDefined()
  })

  it("creates artist with valid data", async () => {
    vi.mocked(db.artist.create).mockResolvedValue({ id: "artist-1" } as never)
    const fd = new FormData()
    fd.set("name", "Die Toten Hosen")
    fd.set("email", "booking@dieToten.de")
    await createArtist({}, fd).catch(() => {}) // redirect throws
    expect(db.artist.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Die Toten Hosen" }) })
    )
  })
})

describe("createArtist — parseArtistFormData (DRY: same as updateArtist)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)
  })

  it("treats empty email as null (not empty string)", async () => {
    vi.mocked(db.artist.create).mockResolvedValue({ id: "a1" } as never)
    const fd = new FormData()
    fd.set("name", "Test")
    fd.set("email", "") // empty → should be treated as optional (no email)
    await createArtist({}, fd).catch(() => {})
    // empty string becomes undefined → stored as null
    const call = vi.mocked(db.artist.create).mock.calls[0][0]
    expect(call.data.email).toBeNull()
  })
})

describe("authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  it("createArtist returns Nicht autorisiert without session", async () => {
    const fd = new FormData()
    fd.set("name", "Test")
    const result = await createArtist({}, fd)
    expect(result.message).toContain("autorisiert")
  })

  it("updateArtist returns Nicht autorisiert without session", async () => {
    const fd = new FormData()
    fd.set("name", "Test")
    const result = await updateArtist("a1", {}, fd)
    expect(result.message).toContain("autorisiert")
  })

  it("deleteArtist redirects to /login without session", async () => {
    const { redirect } = await import("next/navigation")
    await deleteArtist("a1").catch(() => {})
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
