import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  updateContact,
  deleteContact,
} from "@/modules/venues/actions/contact.actions"
import { ContactForm } from "@/modules/venues/components/ContactForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string; contactId: string }>
}

export const metadata = { title: "Ansprechpartner bearbeiten – Booker App" }

export default async function EditContactPage({ params }: Props) {
  const { id, contactId } = await params
  const contact = await db.contactPerson.findUnique({
    where: { id: contactId, venueId: id },
  })
  if (!contact) notFound()

  const updateContactWithId = updateContact.bind(null, contactId, id)
  const deleteContactWithId = deleteContact.bind(null, contactId, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Ansprechpartner bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{contact.name}</p>
      </div>

      <ContactForm
        action={updateContactWithId}
        defaultValues={contact}
        cancelHref={`/venues/${id}?tab=ansprechpartner`}
      />

      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Ansprechpartner löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht diesen Ansprechpartner dauerhaft.
        </p>
        <form action={deleteContactWithId}>
          <Button type="submit" variant="danger" size="sm">
            Ansprechpartner löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
