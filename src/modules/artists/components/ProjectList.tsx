import Link from "next/link"
import { deleteProject } from "@/modules/artists/actions/project.actions"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"
import type { Project } from "@prisma/client"

interface ProjectListProps {
  projects: Project[]
  artistId: string
}

export function ProjectList({ projects, artistId }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Noch keine Projekte"
        description="Lege ein Projekt an, z.B. das Hauptprojekt der Band oder ein Akustik-Set."
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {projects.map((project) => {
        const deleteProjectAction = deleteProject.bind(null, project.id, artistId)

        return (
          <div
            key={project.id}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-900">
                {project.name}
              </span>
              {(project.genre || project.lineup) && (
                <span className="text-xs text-slate-500">
                  {[project.genre, project.lineup].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/artists/${artistId}/projects/${project.id}/edit`}
                className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Bearbeiten
              </Link>
              <form action={deleteProjectAction}>
                <Button type="submit" variant="danger" size="sm">
                  Löschen
                </Button>
              </form>
            </div>
          </div>
        )
      })}
    </div>
  )
}
