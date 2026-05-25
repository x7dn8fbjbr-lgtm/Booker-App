import { createContact } from "@/modules/venues/actions/contact.actions"
import { ContactForm } from "@/modules/venues/components/ContactForm"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Ansprechpartner hinzufügen – Booker App" }

export default async function NewContactPage({ params }: Props) {
  const { id } = await params
  const createContactWithId = createContact.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-slate-900">
        Ansprechpartner hinzufügen
      </h2>
      <ContactForm
        action={createContactWithId}
        cancelHref={`/venues/${id}?tab=ansprechpartner`}
      />
    </div>
  )
}
