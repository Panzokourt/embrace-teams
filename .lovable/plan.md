## Πρόβλημα

Στο rail sidebar (αριστερή στήλη με τα εικονίδια), οι 10 κατηγορίες (Work, Clients, Marketing, Creative, Development, Finance, Operations, Intelligence, Communication, Settings) μαζί με τα standalone items (Logo, My Work, Files) γεμίζουν όλο το ύψος σε μικρές οθόνες (~743px ή χαμηλότερες) και τα bottom actions (Secretary AI ⚡, Theme toggle 🌗, User Avatar 👤) **κόβονται κάτω και δεν φαίνονται**.

Σήμερα η μεσαία λίστα κατηγοριών έχει `flex-1` χωρίς `overflow`, οπότε σπρώχνει τα bottom actions εκτός viewport αντί να scrollάρει.

## Πρόταση λύσης (συνδυασμός)

**A. Πάντα ορατά bottom actions** — Τα Secretary / Theme / Avatar είναι κρίσιμα και πρέπει να μένουν “κολλημένα” στο κάτω μέρος του rail σε κάθε ύψος οθόνης.

**B. “More” overflow menu για κατηγορίες** — Όταν το διαθέσιμο ύψος δεν χωράει όλες τις κατηγορίες, εμφανίζονται όσες χωρούν και οι υπόλοιπες μπαίνουν σε ένα **κουμπί “More” (⋯)** στο τέλος της λίστας. Με κλικ ανοίγει popover (όπως η εικόνα ClickUp που στείλατε) με grid από τα υπόλοιπα εικονίδια κατηγοριών — με tooltip-style labels και κανονική συμπεριφορά κλικ (άνοιγμα flyout κατηγορίας).

**Γιατί συνδυασμός και όχι απλό scroll:** Καθαρό scroll στις κατηγορίες είναι λιγότερο ανακαλύψιμο (ο χρήστης δεν βλέπει ότι υπάρχουν κι άλλα), ενώ το “More” popover είναι πιο εμφανές pattern και δίνει γρήγορη πρόσβαση σε όλα τα modules με ένα κλικ.

## Τεχνικό σχέδιο

**Αρχείο που αλλάζει:** `src/components/layout/AppSidebar.tsx` (μόνο το `IconRail` component, ~γραμμές 250–421).

1. **Νέο hook μέτρησης χώρου** μέσα στο `IconRail`:
   - `useRef` στο container των κατηγοριών (`categoriesRef`).
   - `ResizeObserver` που υπολογίζει πόσες κατηγορίες χωράνε:
     ```ts
     const ITEM_HEIGHT = 44;   // py-1.5 + icon + label
     const MORE_BTN_HEIGHT = 44;
     const visibleCount = Math.floor(containerHeight / ITEM_HEIGHT);
     ```
   - State: `visibleCategories` & `overflowCategories`.

2. **Layout fix στο rail container** (γρ. 251–260):
   - Προσθήκη `min-h-0` στο root flex.
   - Το div των κατηγοριών (γρ. 316) γίνεται `flex-1 min-h-0` (χωρίς overflow), και η λογική κόβει τη λίστα στις `visibleCount` items.
   - Τα bottom actions (γρ. 344) μένουν `mt-auto shrink-0` ώστε να πατάνε πάντα στο τέλος.

3. **More button (όταν `overflowCategories.length > 0`):**
   - Νέο button κάτω από τις ορατές κατηγορίες με icon `MoreHorizontal` (lucide) + label "More".
   - Wrapped σε `Popover` (`@/components/ui/popover` — ήδη imported).
   - `PopoverContent` side="right" με grid 2 ή 3 στηλών:
     ```tsx
     <div className="grid grid-cols-2 gap-2 p-2">
       {overflowCategories.map(cat => (
         <button onClick={() => { handleCategoryClick(cat.id); setMoreOpen(false); }}
                 className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent">
           <cat.icon className="h-5 w-5" />
           <span className="text-xs">{cat.label}</span>
         </button>
       ))}
     </div>
     ```
   - Αν η ενεργή κατηγορία είναι μέσα στο overflow, εμφανίζουμε ένα μικρό dot indicator πάνω στο More button.

4. **Ευφυής σειρά κατηγοριών:** Δεν αλλάζει η σειρά του `categories` array. Απλά οι τελευταίες (πχ Settings, Communication) θα μπαίνουν συνήθως στο More. Αν η ενεργή κατηγορία πέφτει στο overflow, την προωθούμε αυτόματα στις ορατές (swap) ώστε να φαίνεται πάντα active state.

5. **Mobile sheet (`isMobileSheet`):** Παραμένει η υπάρχουσα συμπεριφορά (full-height drawer χωρίς overflow πρόβλημα). Το More button ενεργοποιείται μόνο όταν χρειάζεται (έλεγχος μέσω ResizeObserver — δουλεύει και στις δύο περιπτώσεις).

## Τι μένει ίδιο

- Όλα τα styles/χρώματα του dark rail.
- Logo, My Work, Files standalone buttons πάνω-πάνω.
- Flyout panel που ανοίγει δίπλα στο rail κατά το κλικ κατηγορίας.
- Bottom actions: Secretary, Theme, Avatar — απλά τώρα **εγγυημένα ορατά**.

## Αποτέλεσμα

- Σε ψηλές οθόνες (>900px): φαίνονται όλες οι 10 κατηγορίες, κανένα More button (no visual change).
- Σε μεσαίες (~700–800px): εμφανίζονται 6–8 κατηγορίες + “More” με τις υπόλοιπες.
- Σε μικρές (<700px): εμφανίζονται 4–5 + “More” popover για τα υπόλοιπα.
- Τα Secretary / Theme / Avatar **πάντα ορατά**.
