// @hit/feature-pack-workflow-core
// A HIT feature pack

// Pages - exported individually for tree-shaking
export { WorkflowRunsList } from './pages/WorkflowRunsList';
export { WorkflowRunDetail } from './pages/WorkflowRunDetail';
export { WorkflowGates } from './pages/WorkflowGates';

// Schema
export {
  principalTypeEnum,
  WORKFLOW_PERMISSIONS,
  workflows,
  workflowVersions,
  workflowAcls,
  workflowRuns,
  workflowRunEvents,
  workflowTasks,
  type WorkflowPermission,
  type Workflow,
  type InsertWorkflow,
  type WorkflowVersion,
  type InsertWorkflowVersion,
  type WorkflowAcl,
  type InsertWorkflowAcl,
  type WorkflowRun,
  type InsertWorkflowRun,
  type WorkflowRunEvent,
  type InsertWorkflowRunEvent,
  type WorkflowTask,
  type InsertWorkflowTask,
} from './schema/workflows';

// Hooks - exported explicitly to avoid name conflicts with schema types
export {
  useAllWorkflowRuns,
  useWorkflowRun,
  useWorkflowRunEvents,
  useWorkflowRunTasks,
  useMyWorkflowTasks,
  type WorkflowRunStatus,
  type WorkflowTaskStatus,
  type WorkflowRunSummary,
  type WorkflowRunDetail as WorkflowRunDetailData,
} from './hooks/useWorkflowRuns';
