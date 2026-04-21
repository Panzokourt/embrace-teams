import type { EntitySchema, ImportEntity } from './types';
import { clientSchema } from './clientSchema';
import { projectSchema } from './projectSchema';
import { taskSchema } from './taskSchema';

export const SCHEMAS: Record<ImportEntity, EntitySchema> = {
  clients: clientSchema,
  projects: projectSchema,
  tasks: taskSchema,
};

export function getSchema(entity: ImportEntity): EntitySchema {
  return SCHEMAS[entity];
}

export type { EntitySchema, ImportEntity, FieldDef } from './types';
