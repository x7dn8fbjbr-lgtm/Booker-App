"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Card, CardContent } from "@/components/ui/Card"
import type { VenueFormState } from "@/modules/venues/actions/venue.actions"
import type { Venue } from "@prisma/client"

interface VenueFormProps {
  action: (prevState: VenueFormState, formData: FormData) => Promise<VenueFormState>
  defaultValues?: Pick<
    Venue,
    "name" | "city" | "street" | "zip" | "capacity" | "stageSizeM2" | "type" | "genreTags"
  >
  cancelHref: string
}

const initialState: VenueFormState = {}

export function VenueForm({ action, defaultValues, cancelHref }: VenueFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-5">
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
            placeholder="Club Volta"
          />
          <Input
            label="Stadt"
            name="city"
            defaultValue={defaultValues?.city ?? ""}
            error={state.errors?.city?.[0]}
            placeholder="Köln"
          />
          <Input
            label="Straße"
            name="street"
            defaultValue={defaultValues?.street ?? ""}
            error={state.errors?.street?.[0]}
            placeholder="Musterstraße 1"
          />
          <Input
            label="PLZ"
            name="zip"
            defaultValue={defaultValues?.zip ?? ""}
            error={state.errors?.zip?.[0]}
            placeholder="50667"
          />
          <Input
            label="Kapazität"
            name="capacity"
            type="number"
            min="1"
            defaultValue={defaultValues?.capacity?.toString() ?? ""}
            error={state.errors?.capacity?.[0]}
            placeholder="500"
          />
          <Input
            label="Bühnengröße (m²)"
            name="stageSizeM2"
            type="number"
            min="0"
            step="0.1"
            defaultValue={defaultValues?.stageSizeM2?.toString() ?? ""}
            error={state.errors?.stageSizeM2?.[0]}
            placeholder="50"
          />
          <Select
            label="Typ"
            name="type"
            defaultValue={defaultValues?.type ?? "SONSTIGE"}
            error={state.errors?.type?.[0]}
          >
            <option value="CLUB">Club</option>
            <option value="THEATER">Theater</option>
            <option value="FESTIVAL">Festival</option>
            <option value="OPEN_AIR">Open Air</option>
            <option value="SONSTIGE">Sonstige</option>
          </Select>
          <Input
            label="Genre-Tags (kommagetrennt)"
            name="genreTags"
            defaultValue={defaultValues?.genreTags?.join(", ") ?? ""}
            error={state.errors?.genreTags?.[0]}
            placeholder="Rock, Indie, Jazz"
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
