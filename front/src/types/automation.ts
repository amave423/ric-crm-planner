export type AutomationScope = "crm" | "tasks";

export type AutomationRunMode = "queue" | "parallel";

export type AutomationTiming = "immediate" | "delayed";

export type AutomationCondition =
  | "always"
  | "important"
  | "overdue"
  | "has_vk"
  | "testing"
  | "deadline_soon";

export interface AutomationStage {
  id: string;
  title: string;
  description: string;
}

export interface AutomationCommonSettings {
  runMode: AutomationRunMode;
  timing: AutomationTiming;
  delayMinutes: number;
  condition: AutomationCondition;
}

export interface AutomationRobot {
  id: string;
  stageId: string;
  title: string;
  description: string;
  action: string;
  enabled: boolean;
  settings: AutomationCommonSettings;
  subject: string;
  message: string;
}

export interface AutomationTrigger {
  id: string;
  stageId: string;
  title: string;
  description: string;
  eventCode: string;
  enabled: boolean;
  settings: AutomationCommonSettings;
  targetStageId: string;
  allowBackTransition: boolean;
}

export interface AutomationConfig {
  scope: AutomationScope;
  eventId: number;
  updatedAt: string;
  stages: AutomationStage[];
  triggers: AutomationTrigger[];
  robots: AutomationRobot[];
}
