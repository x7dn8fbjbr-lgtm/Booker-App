import Link from "next/link"
import { deleteContact } from "@/modules/venues/actions/contact.actions"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"
import type { ContactPerson } from "@prisma/client"

interface ContactListProps {
  contacts: ContactPerson[]
  venueId: string
}

export function ContactList({ contacts, venueId }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <EmptyState
        title="Noch keine Ansprechpartner"
        description="Füge einen Ansprechpartner für diese Venue hinzu."
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {contacts.map((contact) => {
        const deleteContactAction = deleteContact.bind(null, contact.id, venueId)
        return (
          <div
            key={contact.id}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-900">
                {contact.name}
              </span>
              {(contact.role || contact.email || contact.phone) && (
                <span className="text-xs text-slate-500">
                  {[contact.role, contact.email, contact.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/venues/${venueId}/contacts/${contact.id}/edit`}
                className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Bearbeiten
              </Link>
              <form action={deleteContactAction}>
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
