

# Ενίσχυση Σελίδας Πελατών & Προσθήκη Τομέα (Sector)

## Επισκόπηση

Προσθήκη πεδίου **Τομέας** (Δημόσιος, Ιδιωτικός, Μη Κερδοσκοπικός κλπ.) τόσο στους πελάτες όσο και στο ευρετήριο επαφών, και εμπλουτισμός της σελίδας πελατών με περισσότερα πεδία (ΑΦΜ, ιστοσελίδα, τηλέφωνο 2ο, tags κλπ).

---

## 1. Database Migration

### Πίνακας `clients` — Νέες στήλες
- `sector` text (public, private, non_profit, government, mixed) default null
- `website` text
- `tax_id` text (ΑΦΜ)
- `secondary_phone` text
- `tags` text[] default '{}'
- `logo_url` text

### Πίνακας `contacts` — Νέα στήλη
- `sector` text default null

---

## 2. Τομέας (Sector) — Τιμές

| Τιμή | Ετικέτα |
|------|---------|
| public | Δημόσιος Τομέας |
| private | Ιδιωτικός Τομέας |
| non_profit | Μη Κερδοσκοπικός |
| government | Κυβερνητικός |
| mixed | Μικτός |

---

## 3. Σελίδα Πελατών (`Clients.tsx`)

### Φόρμα Δημιουργίας/Επεξεργασίας — Νέα πεδία:
- Τομέας (Select dropdown)
- ΑΦΜ
- Ιστοσελίδα
- Δεύτερο Τηλέφωνο
- Tags (ίδια λογική με contacts)
- Logo URL

### Πίνακας (`ClientsTableView.tsx`)
- Νέα στήλη "Τομέας" με badge
- Νέα στήλη "Tags"
- Στήλη "ΑΦΜ" (κρυμμένη by default, sortable)

### Καρτέλα Πελάτη (`ClientDetail.tsx`)
- Εμφάνιση τομέα, ΑΦΜ, ιστοσελίδας, 2ου τηλεφώνου, tags
- Link προς αντίστοιχο contact στο Ευρετήριο (αν υπάρχει)

---

## 4. Ευρετήριο Επαφών — Sector

### Φόρμα (`ContactForm.tsx`)
- Νέο πεδίο "Τομέας" (Select dropdown) δίπλα στην Κατηγορία

### Πίνακας (`ContactsTableView.tsx`)
- Badge τομέα δίπλα στην κατηγορία

### Καρτέλα (`ContactDetail.tsx`)
- Εμφάνιση τομέα στο header/info

---

## Αρχεία που Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration SQL** | ALTER TABLE clients ADD COLUMN sector, website, tax_id, secondary_phone, tags, logo_url. ALTER TABLE contacts ADD COLUMN sector |
| `src/pages/Clients.tsx` | Εμπλουτισμός φόρμας με νέα πεδία (sector, tax_id, website, secondary_phone, tags) |
| `src/components/clients/ClientsTableView.tsx` | Νέες στήλες: Τομέας, Tags |
| `src/pages/ClientDetail.tsx` | Εμφάνιση νέων πεδίων στην καρτέλα |
| `src/components/contacts/ContactForm.tsx` | Νέο πεδίο Τομέας |
| `src/components/contacts/ContactsTableView.tsx` | Badge τομέα |
| `src/pages/ContactDetail.tsx` | Εμφάνιση τομέα |

