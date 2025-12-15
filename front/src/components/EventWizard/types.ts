export type WizardMode = "create" | "edit";
export type WizardTab = "event" | "directions" | "projects";

export type WizardPage = "events" | "directions" | "projects";

export interface DirectionModel {
  id: number;
  title: string;
  description?: string;
  projects?: any[];
}

export interface WizardContextState {
  mode: WizardMode;
  activeTab: WizardTab;
  page: WizardPage;

  eventId?: number;
  directionId?: number;

  setActiveTab: (tab: WizardTab) => void;

  isEventSaved?: boolean;
  saveEvent?: (data: any) => void;

  savedDirections?: DirectionModel[];
  savedEvent?: any;
  isDirectionsSaved?: boolean;
  saveDirections?: (dirs: DirectionModel[]) => void;
}