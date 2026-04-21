import type { EntitySchema } from './types';

export const clientSchema: EntitySchema = {
  entity: 'clients',
  label: 'Πελάτες',
  labelPlural: 'πελάτες',
  fields: [
    {
      key: 'name',
      label: 'Επωνυμία',
      required: true,
      type: 'string',
      aliases: ['name', 'όνομα', 'ονομα', 'επωνυμία', 'επωνυμια', 'company', 'εταιρία', 'εταιρια', 'πελάτης', 'πελατης'],
    },
    { key: 'sector', label: 'Κλάδος', type: 'string', aliases: ['sector', 'κλάδος', 'κλαδος', 'industry', 'τομέας', 'τομεας'] },
    { key: 'website', label: 'Website', type: 'url', aliases: ['website', 'site', 'url', 'ιστοσελίδα', 'ιστοσελιδα'] },
    {
      key: 'contact_email',
      label: 'Email επικοινωνίας',
      type: 'email',
      aliases: ['email', 'contact_email', 'e-mail', 'mail', 'ηλεκτρονικό ταχυδρομείο'],
    },
    {
      key: 'contact_phone',
      label: 'Τηλέφωνο',
      type: 'phone',
      aliases: ['phone', 'telephone', 'τηλέφωνο', 'τηλεφωνο', 'tel', 'κινητό', 'κινητο'],
    },
    { key: 'secondary_phone', label: 'Δευτερεύον τηλέφωνο', type: 'phone', aliases: ['secondary_phone', 'phone2', 'mobile'] },
    { key: 'address', label: 'Διεύθυνση', type: 'string', aliases: ['address', 'διεύθυνση', 'διευθυνση'] },
    { key: 'tax_id', label: 'ΑΦΜ', type: 'string', aliases: ['tax_id', 'afm', 'αφμ', 'vat'] },
    { key: 'tags', label: 'Tags (διαχωρισμός με κόμμα)', type: 'tags', aliases: ['tags', 'ετικέτες', 'ετικετες', 'labels'] },
    { key: 'notes', label: 'Σημειώσεις', type: 'string', aliases: ['notes', 'σημειώσεις', 'σημειωσεις', 'comments', 'description'] },
  ],
  exampleRow: {
    name: 'Acme Α.Ε.',
    sector: 'private',
    website: 'https://acme.gr',
    contact_email: 'info@acme.gr',
    contact_phone: '2101234567',
    address: 'Λ. Κηφισίας 1, Αθήνα',
    tax_id: '999999999',
    tags: 'VIP, Long-term',
    notes: 'Εισήχθη μέσω wizard',
  },
};
