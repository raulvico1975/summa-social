import { ContactManager } from '@/components/contact-manager';
import { contacts } from '@/lib/data';

export default function ContactsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Contactos</h1>
        <p className="text-muted-foreground">Gestiona los contactos de tu organización.</p>
      </div>
      <ContactManager initialContacts={contacts} />
    </div>
  );
}
