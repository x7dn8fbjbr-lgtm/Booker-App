// src/modules/artists/components/ProjectForm.tsx
"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import type { ProjectFormState } from "@/modules/artists/actions/project.actions"
import type { Project } from "@prisma/client"

interface ProjectFormProps {
  action: (
    prevState: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>
  defaultValues?: Pick<Project, "name" | "genre" | "lineup" | "description">
  cancelHref: string
}

const initialState: ProjectFormState = {}

export function ProjectForm({
  action,
  defaultValues,
  cancelHref,
}: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {defaultValues ? "Projekt bearbeiten" : "Projekt anlegen"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.message && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {state.message}
            </p>
          )}

          <Input
            label="Projektname"
            name="name"
            required
            autoFocus
            defaultValue={defaultValues?.name ?? ""}
            error={state.errors?.name?.[0]}
            placeholder="z.B. Hauptprojekt, Akustik-Set, DJ-Set"
          />

          <Input
            label="Genre"
            name="genre"
            defaultValue={defaultValues?.genre ?? ""}
            error={state.errors?.genre?.[0]}
            placeholder="z.B. Indie Pop, Jazz, Electronic"
          />

          <Input
            label="Besetzung"
            name="lineup"
            defaultValue={defaultValues?.lineup ?? ""}
            error={state.errors?.lineup?.[0]}
            placeholder="z.B. Duo, Quartett, Solo"
          />

          <Textarea
            label="Beschreibung"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            error={state.errors?.description?.[0]}
            placeholder="Kurzbeschreibung des Projekts…"
          />

          <div className="flex gap-3 justify-end pt-2">
            <Link
              href={cancelHref}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Abbrechen
            </Link>
            <Button type="submit" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
