"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import type { ArtistFormState } from "@/modules/artists/actions/artist.actions"
import type { Artist } from "@prisma/client"

interface ArtistFormProps {
  action: (
    prevState: ArtistFormState,
    formData: FormData
  ) => Promise<ArtistFormState>
  defaultValues?: Pick<Artist, "name" | "email" | "phone" | "website">
  cancelHref: string
}

const initialState: ArtistFormState = {}

export function ArtistForm({
  action,
  defaultValues,
  cancelHref,
}: ArtistFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {defaultValues ? "Artist bearbeiten" : "Artist anlegen"}
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
            label="Name"
            name="name"
            required
            autoFocus
            defaultValue={defaultValues?.name ?? ""}
            error={state.errors?.name?.[0]}
            placeholder="Künstlername oder Bandname"
          />

          <Input
            label="E-Mail"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            error={state.errors?.email?.[0]}
            placeholder="booking@beispiel.de"
          />

          <Input
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            error={state.errors?.phone?.[0]}
            placeholder="+49 123 456789"
          />

          <Input
            label="Website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
            error={state.errors?.website?.[0]}
            placeholder="https://beispiel.de"
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
