// src/app/(dashboard)/artists/[id]/projects/[projectId]/edit/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  updateProject,
  deleteProject,
} from "@/modules/artists/actions/project.actions"
import { ProjectForm } from "@/modules/artists/components/ProjectForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string; projectId: string }>
}

export const metadata = { title: "Projekt bearbeiten – Booker App" }

export default async function EditProjectPage({ params }: Props) {
  const { id: artistId, projectId } = await params

  const project = await db.project.findUnique({
    where: { id: projectId, artistId },
  })
  if (!project) notFound()

  const updateProjectWithIds = updateProject.bind(null, projectId, artistId)
  const deleteProjectWithIds = deleteProject.bind(null, projectId, artistId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Projekt bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{project.name}</p>
      </div>

      <ProjectForm
        action={updateProjectWithIds}
        defaultValues={project}
        cancelHref={`/artists/${artistId}?tab=projekte`}
      />

      {/* Gefahrenzone */}
      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Projekt löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht dieses Projekt dauerhaft.
        </p>
        <form action={deleteProjectWithIds}>
          <Button type="submit" variant="danger" size="sm">
            Projekt löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
