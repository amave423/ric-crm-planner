import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { getEvents } from "../../api/events";
import { getRequests as apiGetRequests, saveRequest, updateRequestStatus } from "../../api/requests";
import EventWizardModal, { type WizardLaunchContext } from "../../components/EventWizard/EventWizardModal";
import TableHeader from "../../components/Layout/TableHeader";
import InfoModal from "../../components/Modal/InfoModal";
import Modal from "../../components/Modal/Modal";
import ApplyModal from "../../components/Requests/ApplyModal";
import Table from "../../components/Table/Table";
import { useToast } from "../../components/Toast/ToastProvider";
import { buildMockRequestTransitionUrl, REQUEST_STATUS } from "../../constants/requestProgress";
import { AuthContext } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { Event } from "../../types/event";
import type { Request as RequestType } from "../../types/request";
import "../../styles/page-colors.scss";
import AppButton from "../../components/UI/Button";

interface TestingImportMetaEnv {
  VITE_TESTING_URL?: string;
}

const TESTING_BASE_URL =
  ((import.meta as ImportMeta & { env?: TestingImportMetaEnv }).env?.VITE_TESTING_URL || "").trim() || "https://example.com/testing";

function buildTestingUrl(req: RequestType) {
  try {
    const url = new URL(TESTING_BASE_URL, window.location.origin);
    if (req.id) url.searchParams.set("applicationId", String(req.id));
    if (req.eventId) url.searchParams.set("eventId", String(req.eventId));
    if (req.ownerId) url.searchParams.set("ownerId", String(req.ownerId));
    return url.toString();
  } catch {
    return TESTING_BASE_URL;
  }
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const isStudent = user?.role === "student";

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContext, setWizardContext] = useState<WizardLaunchContext | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [testingPromptOpen, setTestingPromptOpen] = useState(false);
  const [testingPromptStep, setTestingPromptStep] = useState<"ask" | "info">("ask");
  const [pendingRequest, setPendingRequest] = useState<RequestType | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<{ title?: string; description?: string } | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const [events, loadedRequests] = await Promise.all([
        getEvents(),
        user ? apiGetRequests({ ownerId: user.id, role: user.role }).catch(() => []) : Promise.resolve([]),
      ]);
      setAllEvents(events || []);
      setRequests(Array.isArray(loadedRequests) ? loadedRequests : []);
    } catch {
      setAllEvents([]);
      setRequests([]);
    }
  }, [user]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const refreshRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      return;
    }
    const loadedRequests = await apiGetRequests({ ownerId: user.id, role: user.role }).catch(() => []);
    setRequests(Array.isArray(loadedRequests) ? loadedRequests : []);
  }, [user]);

  const events = useMemo(() => {
    if (!search.trim()) return allEvents;
    const query = search.toLowerCase();
    return allEvents.filter(
      (event) =>
        (event.title || "").toLowerCase().includes(query) ||
        (event.organizer || "").toLowerCase().includes(query) ||
        (event.status || "").toLowerCase().includes(query)
    );
  }, [allEvents, search]);

  const hasRequestForEvent = useCallback(
    (eventId: number) => requests.some((request) => Number(request.ownerId) === Number(user?.id) && Number(request.eventId) === Number(eventId)),
    [requests, user?.id]
  );

  const closeTestingPrompt = () => {
    setTestingPromptOpen(false);
    setTestingPromptStep("ask");
    setPendingRequest(null);
  };

  const openLink = (url: string) => {
    const trimmed = url.trim();
    closeTestingPrompt();
    if (!trimmed) return;

    try {
      const nextUrl = new URL(trimmed, window.location.origin);
      if (nextUrl.origin === window.location.origin) {
        navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        return;
      }
    } catch {
      return;
    }

    window.location.assign(trimmed);
  };

  const startTestingScenario = async () => {
    if (!pendingRequest?.id) return;

    try {
      if (client.USE_MOCK) {
        await updateRequestStatus(Number(pendingRequest.id), REQUEST_STATUS.TESTING);
      }

      const link = client.USE_MOCK
        ? buildMockRequestTransitionUrl(Number(pendingRequest.id), REQUEST_STATUS.JOINED_CHAT, "testing")
        : buildTestingUrl(pendingRequest);

      addNotification({
        userId: user?.id,
        title: "Приглашение на тестирование",
        message: client.USE_MOCK
          ? "Откройте ссылку и подтвердите переход к следующему этапу."
          : "Для продолжения откройте ссылку и пройдите тест.",
        link,
      });

      await refreshRequests();
      openLink(link);
    } catch {
      showToast("error", "Не удалось запустить сценарий тестирования");
    }
  };

  const startDirectScenario = async () => {
    if (!pendingRequest?.id) return;

    const link = client.USE_MOCK
      ? buildMockRequestTransitionUrl(Number(pendingRequest.id), REQUEST_STATUS.STARTED, "start")
      : buildTestingUrl(pendingRequest);

    addNotification({
      userId: user?.id,
      title: "Ссылка для перехода к ПШ",
      message: "Ссылка для прохождения находится в центре уведомлений.",
      link,
    });

    setTestingPromptStep("info");
    await refreshRequests();
  };

  return (
    <div className="page page--events">
      <TableHeader
        title="Мероприятия"
        search={search}
        onSearch={setSearch}
        onCreate={() => {
          setMode("create");
          setWizardContext({ type: "event" });
          setWizardOpen(true);
        }}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "startDate", title: "Дата начала" },
          { key: "endDate", title: "Дата окончания" },
          { key: "organizer", title: "Организатор" },
          { key: "status", title: "Статус" },
          ...(isStudent ? [{ key: "apply", title: "Заявка", width: "190px" }] : []),
        ]}
        data={events}
        badgeKeys={["startDate", "endDate", "status"]}
        onRowClick={(row) => navigate(`/events/${row.id}/directions`)}
        onEdit={(row) => {
          setMode("edit");
          setWizardContext({ type: "event", eventId: row.id });
          setWizardOpen(true);
        }}
        onInfoClick={(row) => {
          setInfoItem({ title: row.title || "-", description: row.description || "Нет описания" });
          setInfoOpen(true);
        }}
        renderCell={(row, colKey) => {
          if (colKey !== "apply") return undefined;

          const event = row as Event;
          const eventId = Number(event.id);
          const alreadyApplied = hasRequestForEvent(eventId);
          const isEnrollmentClosed = String(event.status || "").trim().toLowerCase() === "набор завершен";

          if (isEnrollmentClosed) {
            return <span className="event-apply-placeholder" />;
          }

          return (
            <AppButton
              type="button"
              className={`event-apply-pill${alreadyApplied ? " is-disabled" : ""}`}
              disabled={alreadyApplied}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                if (alreadyApplied) return;
                setSelectedEvent(event);
                setApplyOpen(true);
              }}
            >
              {alreadyApplied ? "Заявка отправлена" : "Подать заявку"}
            </AppButton>
          );
        }}
      />

      {wizardOpen && wizardContext && (
        <EventWizardModal
          mode={mode}
          context={wizardContext}
          onClose={() => {
            setWizardOpen(false);
            void loadEvents();
          }}
        />
      )}

      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        eventId={selectedEvent?.id}
        eventTitle={selectedEvent?.title}
        specializations={selectedEvent?.specializations || []}
        onSubmit={async (request) => {
          if (!user?.id || !selectedEvent?.id) return false;

          if (hasRequestForEvent(Number(selectedEvent.id))) {
            showToast("error", "Вы уже отправляли заявку на это мероприятие");
            return false;
          }

          try {
            const created = await saveRequest({
              ...request,
              ownerId: user.id,
              eventId: selectedEvent.id,
              eventTitle: selectedEvent.title,
            });
            setPendingRequest(created);
            setTestingPromptStep("ask");
            setTestingPromptOpen(true);
            showToast("success", "Заявка отправлена");
            await refreshRequests();
            return true;
          } catch {
            showToast("error", "Ошибка при отправке заявки");
            return false;
          }
        }}
      />

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title={infoItem?.title} description={infoItem?.description} />

      <Modal isOpen={testingPromptOpen} onClose={closeTestingPrompt} title="Переход по заявке">
        {testingPromptStep === "ask" ? (
          <div className="confirm-body">
            <div className="confirm-text">Перейти к прохождению теста?</div>
            <div className="confirm-actions">
              <AppButton className="close-btn" onClick={startDirectScenario}>
                Нет
              </AppButton>
              <AppButton className="btn-send" onClick={startTestingScenario}>
                Да
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="confirm-body">
            <div className="confirm-text">Ссылка для прохождения находится в центре уведомлений</div>
            <div className="confirm-actions">
              <AppButton className="close-btn" onClick={closeTestingPrompt}>
                Понятно
              </AppButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
