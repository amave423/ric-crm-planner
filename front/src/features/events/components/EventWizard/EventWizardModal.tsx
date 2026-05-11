import { SettingOutlined } from "@ant-design/icons";
import { Modal as AntModal } from "antd";
import { createContext, useContext, useState } from "react";
import "./event-wizard.scss";

import EventForm from "./forms/EventForm";
import DirectionForm from "./forms/DirectionForm";
import ProjectForm from "./forms/ProjectForm";
import FormBuilderForm from "./forms/FormBuilderForm";
import AutomationPanel from "../../../automation/components/AutomationPanel";
import { useToast } from "../../../../components/Toast/ToastProvider";

import type { DirectionModel, WizardContextState, WizardMode, WizardPage, WizardTab } from "./types";
import type { Event } from "../../../../types/event";
import AppButton from "../../../../components/UI/Button";

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
  onClose,
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
  const [savedEvent, setSavedEvent] = useState<Event | null>(null);
  const [savedDirections, setSavedDirections] = useState<DirectionModel[]>([]);
  const [isDirectionsSaved, setIsDirectionsSaved] = useState(false);
  const [eventIdState, setEventIdState] = useState<number | undefined>(initialEventId ?? context?.eventId);
  const [automationOpen, setAutomationOpen] = useState(false);
  const { showToast } = useToast();

  const automationEventId = Number(eventIdState ?? savedEvent?.id ?? 0) || null;

  const saveEvent = (data: Event) => {
    setSavedEvent(data);
    setIsEventSaved(true);
    if (data?.id) setEventIdState(Number(data.id));
  };

  const saveDirections = (dirs: DirectionModel[]) => {
    setSavedDirections(dirs);
    setIsDirectionsSaved(dirs.length > 0);
  };

  const ctxValue: WizardContextState = {
    mode,
    activeTab,
    page: resolvedPage,
    eventId: eventIdState,
    directionId: initialDirectionId ?? context?.directionId,
    projectId: context?.projectId,
    setActiveTab,
    isEventSaved,
    saveEvent,
    savedEvent,
    savedDirections,
    isDirectionsSaved,
    saveDirections,
  };

  return (
    <WizardContext.Provider value={ctxValue}>
      <div className="wizard-overlay" onClick={onClose}>
        <div className={`wizard wizard-tab--${activeTab}`} onClick={(event) => event.stopPropagation()}>
          <AppButton className="wizard-close" aria-label="Закрыть" onClick={onClose}>
            x
          </AppButton>

          <aside className="wizard-nav">
            <NavButton tab="event" label="Настройка мероприятия" />
            <NavButton tab="directions" label="Настройка направлений" />
            <NavButton tab="projects" label="Настройка проектов" />
            <NavButton tab="form" label="Конструктор формы" />
            <AppButton
              type="button"
              className="wizard-nav-btn wizard-nav-btn--automation"
              onClick={() => {
                if (!automationEventId) {
                  showToast("error", "Сначала сохраните настройки мероприятия.");
                  return;
                }
                setAutomationOpen(true);
              }}
            >
              <SettingOutlined />
              <span>Роботы и триггеры</span>
            </AppButton>
          </aside>

          <section className="wizard-content">
            {activeTab === "event" && <EventForm />}
            {activeTab === "directions" && <DirectionForm />}
            {activeTab === "projects" && <ProjectForm />}
            {activeTab === "form" && <FormBuilderForm />}
          </section>
        </div>
      </div>

      <AntModal
        open={automationOpen}
        onCancel={() => setAutomationOpen(false)}
        footer={null}
        width="min(1380px, calc(100vw - 32px))"
        centered
        zIndex={1400}
        destroyOnHidden
        className="automation-settings-modal"
        title="Настройка роботов и триггеров CRM"
      >
        {automationEventId && <AutomationPanel scope="crm" lockedEventId={automationEventId} className="automation-panel--modal" />}
      </AntModal>
    </WizardContext.Provider>
  );
}

function NavButton({ tab, label }: { tab: WizardTab; label: string }) {
  const { activeTab, setActiveTab, mode, isEventSaved, isDirectionsSaved, eventId, directionId } = useWizard();
  const { showToast } = useToast();

  const handleClick = () => {
    if (mode === "create") {
      if ((tab === "directions" || tab === "projects" || tab === "form") && !isEventSaved && !eventId) {
        showToast("error", "Сначала сохраните настройки мероприятия.");
        return;
      }

      if (tab === "projects" && !isDirectionsSaved && !directionId) {
        showToast("error", "Добавьте и сохраните хотя бы одно направление перед переходом к проектам.");
        return;
      }
    }

    setActiveTab(tab);
  };

  return (
    <AppButton
      type="button"
      className={`wizard-nav-btn ${activeTab === tab ? "active" : ""} wizard-nav-btn--${tab}`}
      onClick={handleClick}
    >
      {label}
    </AppButton>
  );
}

