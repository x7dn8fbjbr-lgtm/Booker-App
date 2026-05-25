import type { ContactPerson } from "@prisma/client"

interface ContactListProps {
  contacts: ContactPerson[]
  venueId: string
}

export function ContactList({ contacts, venueId }: ContactListProps) {
  return <div>{contacts.length} Ansprechpartner</div>
}
