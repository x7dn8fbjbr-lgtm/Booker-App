// src/app/(dashboard)/artists/[id]/projects/new/page.tsx
import { notFound } from "next/navigation"
import { getArtistById } from "@/modules/artists/actions/artist.actions"
import { createProject } from "@/modules/artists/actions/project.actions"
import { ProjectForm } from "@/modules/artists/components/ProjectForm"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Projekt anlegen – Booker App" }

export default async function NewProjectPage({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  if (!artist) notFound()

  const createProjectForArtist = createProject.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Projekt anlegen</h2>
        <p className="mt-0.5 text-sm text-slate-500">für {artist.name}</p>
      </div>

      <ProjectForm
        action={createProjectForArtist}
        cancelHref={`/artists/${id}?tab=projekte`}
      />
    </div>
  )
}
