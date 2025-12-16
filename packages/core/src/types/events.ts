/**
 * Base event interface
 */
export interface BaseEvent {
  type: string;
  timestamp: Date;
  workflowId: string;
}

/**
 * Workflow started event
 */
export interface WorkflowStartedEvent extends BaseEvent {
  type: "workflow.started";
  workflowName: string;
}

/**
 * Workflow completed event
 */
export interface WorkflowCompletedEvent extends BaseEvent {
  type: "workflow.completed";
}

/**
 * Workflow failed event
 */
export interface WorkflowFailedEvent extends BaseEvent {
  type: "workflow.failed";
  error: string;
}

/**
 * Step started event
 */
export interface StepStartedEvent extends BaseEvent {
  type: "step.started";
  stepId: string;
  agentName: string;
}

/**
 * Step completed event
 */
export interface StepCompletedEvent extends BaseEvent {
  type: "step.completed";
  stepId: string;
  agentName: string;
  artifacts: string[];
}

/**
 * Step failed event
 */
export interface StepFailedEvent extends BaseEvent {
  type: "step.failed";
  stepId: string;
  agentName: string;
  error: string;
}

/**
 * Approval required event
 */
export interface ApprovalRequiredEvent extends BaseEvent {
  type: "approval.required";
  stepId: string;
  agentName: string;
}

/**
 * Budget warning event
 */
export interface BudgetWarningEvent extends BaseEvent {
  type: "budget.warning";
  currentUsage: number;
  limit: number;
}

/**
 * Budget exceeded event
 */
export interface BudgetExceededEvent extends BaseEvent {
  type: "budget.exceeded";
  currentUsage: number;
  limit: number;
}

/**
 * Union of all Maestro events
 */
export type MaestroEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | ApprovalRequiredEvent
  | BudgetWarningEvent
  | BudgetExceededEvent;

/**
 * Event handler type
 */
export type EventHandler<T extends MaestroEvent = MaestroEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Interface for the event bus
 */
export interface EventBus {
  /**
   * Emit an event
   */
  emit(event: MaestroEvent): Promise<void>;

  /**
   * Subscribe to events
   */
  on<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void;

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler): void;

  /**
   * Unsubscribe from events
   */
  off<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void;
}
