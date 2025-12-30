import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar, } from 'drizzle-orm/pg-core';
/**
 * Principal Types for ACL
 * Shared enum used across all feature packs (forms, vault, notepad, etc.)
 */
export const principalTypeEnum = pgEnum('principal_type', ['user', 'group', 'role']);
/**
 * Workflow permissions (ACL keys)
 *
 * Admin override rule (enforced in API layer):
 * - admins always can
 * - if workflow has zero ACL entries, only admins can access
 */
export const WORKFLOW_PERMISSIONS = {
    WORKFLOWS_VIEW: 'WORKFLOWS_VIEW',
    WORKFLOWS_EDIT: 'WORKFLOWS_EDIT',
    WORKFLOWS_PUBLISH: 'WORKFLOWS_PUBLISH',
    WORKFLOWS_RUN: 'WORKFLOWS_RUN',
    WORKFLOWS_VIEW_RUNS: 'WORKFLOWS_VIEW_RUNS',
    WORKFLOWS_CANCEL_RUN: 'WORKFLOWS_CANCEL_RUN',
    WORKFLOWS_MANAGE_ACL: 'WORKFLOWS_MANAGE_ACL',
    WORKFLOWS_APPROVE: 'WORKFLOWS_APPROVE',
};
/**
 * Workflows table - identity + metadata (definitions live in versions).
 */
export const workflows = pgTable('workflows', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    ownerUserId: varchar('owner_user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    slugIdx: index('workflows_slug_idx').on(table.slug),
    ownerIdx: index('workflows_owner_user_id_idx').on(table.ownerUserId),
}));
/**
 * Workflow versions table - immutable definitions (draft vs published).
 */
export const workflowVersions = pgTable('workflow_versions', {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
        .notNull()
        .references(() => workflows.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'), // draft | published | archived
    definition: jsonb('definition').$type().notNull().default({}),
    createdByUserId: varchar('created_by_user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workflowIdx: index('workflow_versions_workflow_id_idx').on(table.workflowId),
    workflowStatusIdx: index('workflow_versions_workflow_status_idx').on(table.workflowId, table.status),
    workflowVersionUnique: unique('workflow_versions_workflow_version_unique').on(table.workflowId, table.version),
}));
/**
 * Workflow ACL entries - controls who can view/run/edit/etc.
 */
export const workflowAcls = pgTable('workflow_acls', {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
        .notNull()
        .references(() => workflows.id, { onDelete: 'cascade' }),
    principalType: principalTypeEnum('principal_type').notNull(), // user | group | role
    principalId: varchar('principal_id', { length: 255 }).notNull(),
    permissions: jsonb('permissions').$type().notNull(),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workflowIdx: index('workflow_acls_workflow_idx').on(table.workflowId),
    principalIdx: index('workflow_acls_principal_idx').on(table.principalType, table.principalId),
    workflowPrincipalUnique: unique('workflow_acls_workflow_principal_unique').on(table.workflowId, table.principalType, table.principalId),
}));
