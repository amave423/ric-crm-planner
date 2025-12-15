import { createContext, useContext, useState } from "react";
import "./event-wizard.scss";

import EventForm from "./forms/EventForm";
import DirectionForm from "./forms/DirectionForm";
import ProjectForm from "./forms/ProjectForm";

import type {
  WizardContextState,
  WizardMode,
  WizardPage,
  WizardTab,
  DirectionModel
} from "./types";

export interface WizardLaunchContext {
  type?: string;
  eventId?: number;
  directionId?: number;
  projectId?: number;
}

interface Props {
  mode: WizardMode;
  page?: WizardPage;
  context?: WizardLaunchContext;
  initialEventId?: number;
  initialDirectionId?: number;
  onClose: () => void;
}

export const WizardContext = createContext<WizardContextState | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardContext");
  return ctx;
}

export default function EventWizardModal({
  mode,
  page,
  context,
  initialEventId,
  initialDirectionId,
  onClose
}: Props) {
    const resolvedPage: WizardPage =
    page ??
    (context?.type === "event"
      ? "events"
      : context?.type === "direction"
      ? "directions"
      : context?.type === "projects" || context?.type === "project"
      ? "projects"
      : "events");

  const initialTab: WizardTab =
    resolvedPage === "projects" ? "projects" : resolvedPage === "directions" ? "directions" : "event";

  const [activeTab, setActiveTab] = useState<WizardTab>(initialTab);

  const [isEventSaved, setIsEventSaved] = useState(false);
  const [savedEvent, setSavedEvent] = useState<any>(null);

  const [savedDirections, setSavedDirections] = useState<DirectionModel[]>([]);
  const [isDirectionsSaved, setIsDirectionsSaved] = useState(false);

  const saveEvent = (data: any) => {
    setSavedEvent(data);
    setIsEventSaved(true);
  };

  const saveDirections = (dirs: DirectionModel[]) => {
    setSavedDirections(dirs);
    setIsDirectionsSaved(dirs.length > 0);
  };

  const ctxValue: WizardContextState = {
    mode,
    activeTab,
    page: resolvedPage,
    eventId: initialEventId ?? context?.eventId,
    directionId: initialDirectionId ?? context?.directionId,
    setActiveTab,

    isEventSaved,
    saveEvent,
    savedEvent,

    savedDirections,
    isDirectionsSaved,
    saveDirections
  };

  return (
    <WizardContext.Provider value={ctxValue}>
      <div className="wizard-overlay" onClick={onClose}>
        <div
          className={`wizard wizard-tab--${activeTab}`}
          onClick={(e) => e.stopPropagation()}
          >
          <aside className="wizard-nav">
            <NavButton tab="event" label="Настройка мероприятия" />
            <NavButton tab="directions" label="Настройка направлений" />
            <NavButton tab="projects" label="Настройка проектов" />
          </aside>

          <section className="wizard-content">
            {activeTab === "event" && <EventForm />}
            {activeTab === "directions" && <DirectionForm />}
            {activeTab === "projects" && <ProjectForm />}
          </section>
        </div>
      </div>
    </WizardContext.Provider>
  );
}

function NavButton({ tab, label }: { tab: WizardTab; label: string }) {
  const { activeTab, setActiveTab, mode, isEventSaved, isDirectionsSaved, eventId, directionId } = useWizard();

  const handleClick = () => {
    if (mode === "create") {
      if ((tab === "directions" || tab === "projects") && !isEventSaved && !eventId) {
        alert("Сначала сохраните настройки мероприятия.");
        return;
      }
      if (tab === "projects" && !isDirectionsSaved && !directionId) {
        alert("Добавьте и сохраните хотя бы одно направление перед переходом к проектам.");
        return;
      }
    }
    setActiveTab(tab);
  };

  return (
    <button
      type="button"
      className={`wizard-nav-btn ${activeTab === tab ? "active" : ""} wizard-nav-btn--${tab}`}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}