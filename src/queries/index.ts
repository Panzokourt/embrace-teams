// Phase 1 — Core entities
export { projectKeys, projectQueries } from './projects';
export { clientKeys, clientQueries } from './clients';
export { invoiceKeys, invoiceQueries } from './invoices';
export { expenseKeys, expenseQueries } from './expenses';
export { taskKeys, taskQueries } from './tasks';
export { profileKeys, profileQueries } from './profiles';

// Phase 2 — Secondary entities
export { timesheetKeys, timesheetQueries } from './timesheets';
export { contactKeys, contactQueries } from './contacts';
export { contractKeys, contractQueries } from './contracts';
export { mediaPlanKeys, mediaPlanQueries } from './media-plans';

// Phase 3 — Mutations
export {
  // Projects
  useCreateProject, useUpdateProject, useDeleteProject,
  // Clients
  useCreateClient, useUpdateClient, useDeleteClient,
  // Tasks
  useCreateTask, useUpdateTask, useDeleteTask,
  // Invoices
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
  // Expenses
  useCreateExpense, useUpdateExpense, useDeleteExpense,
  // Contacts
  useCreateContact, useUpdateContact, useDeleteContact,
  // Time Entries
  useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry,
  // Contracts
  useCreateContract, useUpdateContract,
  // Media Plans
  useCreateMediaPlan, useUpdateMediaPlan, useDeleteMediaPlan,
} from './mutations';
