import { useCallback, useContext, useEffect, useState } from "react";
import { Dropdown, Progress, Segmented } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { getEvents } from "../../api/events";
import { getRequests, removeRequest, updateRequestStatus } from "../../api/requests";
import Modal from "../../components/Modal/Modal";
import Table from "../../components/Table/Table";
import { ORGANIZER_REQUEST_STATUSES, REQUEST_STATUS, getRequestTransitionCopy } from "../../constants/requestProgress";
import { AuthContext } from "../../context/AuthContext";
import { useSearchSubmitFeedback } from "../../hooks/useSearchSubmitFeedback";
import type { Event as EventType } from "../../types/event";
import type { Request as RequestType } from "../../types/request";
import "../../styles/page-colors.scss";
import AppButton from "../../components/UI/Button";
import { AppSearch } from "../../components/UI/Input";
import AppSelect from "../../components/UI/Select";
import { useToast } from "../../components/Toast/ToastProvider";
import "./requests.scss";

const TEXT = {
  myRequests: "\u041c\u043e\u0438 \u0437\u0430\u044f\u0432\u043a\u0438",
  requests: "\u0417\u0430\u044f\u0432\u043a\u0438",
  list: "\u0421\u043f\u0438\u0441\u043e\u043a",
  diagram: "\u0414\u0438\u0430\u0433\u0440\u0430\u043c\u043c\u0430",
  search: "\u041f\u043e\u0438\u0441\u043a...",
  studentName: "\u0424\u0418\u041e \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u0430",
  event: "\u041c\u0435\u0440\u043e\u043f\u0440\u0438\u044f\u0442\u0438\u0435",
  specialization: "\u0421\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f",
  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  withdrawRequest: "\u041e\u0442\u043e\u0437\u0432\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443",
  other: "\u041e\u0441\u0442\u0430\u043b\u044c\u043d\u044b\u0435",
  requestsDiagram: "\u0414\u0438\u0430\u0433\u0440\u0430\u043c\u043c\u0430 \u0437\u0430\u044f\u0432\u043e\u043a",
  distribution:
    "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432 \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0438\u043c \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043c",
  total: "\u0432\u0441\u0435\u0433\u043e",
  keyStatuses: "\u041a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b",
  greenSegment:
    "\u0417\u0435\u043b\u0435\u043d\u044b\u0439 \u0441\u0435\u0433\u043c\u0435\u043d\u0442 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432 \u0441\u043e \u0441\u0442\u0430\u0442\u0443\u0441\u043e\u043c",
  percentOfTotal:
    "\u043e\u0442 \u043e\u0431\u0449\u0435\u0433\u043e \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u0430",
  confirmAction:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  withdrawConfirm:
    "\u0412\u044b \u0443\u0432\u0435\u0440\u0435\u043d\u044b, \u0447\u0442\u043e \u0445\u043e\u0442\u0438\u0442\u0435 \u043e\u0442\u043e\u0437\u0432\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443?",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  withdraw: "\u041e\u0442\u043e\u0437\u0432\u0430\u0442\u044c",
  confirmation:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435",
  confirmActionText:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.",
  confirm:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c",
  allEvents:
    "\u0412\u0441\u0435 \u043c\u0435\u0440\u043e\u043f\u0440\u0438\u044f\u0442\u0438\u044f",
  noStudents:
    "\u041d\u0435\u0442 \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432",
  showStudents:
    "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432",
  hideStudents:
    "\u0421\u043a\u0440\u044b\u0442\u044c \u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432",
  requestNotFound:
    "\u0422\u0430\u043a\u043e\u0439 \u0437\u0430\u044f\u0432\u043a\u0438 \u043d\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442!",
} as const;

type RequestRecord = RequestType & {
  eventName?: string;
  event?: string;
  event_name?: string;
};

type RequestTableRow = {
  id: number;
  studentName: string;
  event: string;
  specialization: string;
  status: string;
  raw: RequestRecord;
};

type PendingTransition = {
  requestId: number;
  targetStatus: string;
  title: string;
  message: string;
};

type RequestsView = "list" | "diagram";
type EventFilter = number | "all";
type AnalyticsStatusKey = "submitted" | "testing" | "started" | "other";

type AnalyticsStatus = {
  key: AnalyticsStatusKey;
  label: string;
  count: number;
  color: string;
  students: RequestRecord[];
  showStatus?: boolean;
};

function eventTitleFromRecord(request: RequestRecord) {
  return request.eventTitle || request.eventName || request.event || request.event_name || "-";
}

export default function RequestsPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isOrganizer = user?.role === "organizer";

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<EventFilter>("all");
  const [expandedStatusKeys, setExpandedStatusKeys] = useState<AnalyticsStatusKey[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemoveId, setToRemoveId] = useState<number | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);
  const [view, setView] = useState<RequestsView>("list");

  const load = useCallback(async () => {
    const loadedRequests = await getRequests({ ownerId: user?.id, role: user?.role }).catch(() => []);
    setRequests(Array.isArray(loadedRequests) ? (loadedRequests as RequestRecord[]) : []);
  }, [user?.id, user?.role]);

  const loadEvents = useCallback(async () => {
    const loadedEvents = await getEvents().catch(() => []);
    setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (user?.role !== "student") return;

    const params = new URLSearchParams(location.search);
    if (params.get("requestAction") !== "progress") return;

    const requestId = Number(params.get("requestId"));
    const targetStatus = String(params.get("targetStatus") || "").trim();
    const source = params.get("source") === "testing" ? "testing" : "start";

    if (!requestId || !targetStatus) {
      navigate("/requests", { replace: true });
      return;
    }

    const copy = getRequestTransitionCopy(source, targetStatus);
    setPendingTransition({
      requestId,
      targetStatus,
      title: copy.title,
      message: copy.message,
    });
    setTransitionOpen(true);
  }, [location.search, navigate, user?.role]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateRequestStatus(id, status);
    } finally {
      await load();
    }
  };

  const handleWithdraw = (id: number) => {
    if (!client.USE_MOCK) return;
    setToRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmWithdraw = async () => {
    if (toRemoveId == null) return;
    try {
      await removeRequest(toRemoveId);
    } finally {
      setConfirmOpen(false);
      setToRemoveId(null);
      await load();
    }
  };

  const closeTransitionModal = () => {
    setTransitionOpen(false);
    setPendingTransition(null);
    navigate("/requests", { replace: true });
  };

  const confirmTransition = async () => {
    if (!pendingTransition) {
      closeTransitionModal();
      return;
    }

    try {
      await updateRequestStatus(pendingTransition.requestId, pendingTransition.targetStatus);
      await load();
    } finally {
      closeTransitionModal();
    }
  };

  const toggleStatusList = (statusKey: AnalyticsStatusKey) => {
    setExpandedStatusKeys((current) =>
      current.includes(statusKey) ? current.filter((key) => key !== statusKey) : [...current, statusKey]
    );
  };

  const selectedEvent =
    selectedEventId === "all" ? undefined : events.find((event) => Number(event.id) === Number(selectedEventId));

  const eventDropdownItems: MenuProps["items"] = [
    { key: "all", label: TEXT.allEvents },
    ...events.map((event) => ({
      key: String(event.id),
      label: event.title || `${TEXT.event} #${event.id}`,
    })),
  ];

  const handleEventMenuClick: MenuProps["onClick"] = ({ key }) => {
    setSelectedEventId(key === "all" ? "all" : Number(key));
  };

  const normalizedSearch = search.trim().toLowerCase();
  const selectedEventTitle = String(selectedEvent?.title || "").trim().toLowerCase();

  const matchesSelectedEvent = (request: RequestRecord) => {
    const requestEventTitle = String(eventTitleFromRecord(request)).trim().toLowerCase();
    if (!isOrganizer) return true;
    return selectedEventId === "all" || Number(request.eventId) === Number(selectedEventId) || (!!selectedEventTitle && requestEventTitle === selectedEventTitle);
  };

  const matchesCurrentUser = (request: RequestRecord) =>
    user?.role === "student" ? Number(request.ownerId) === Number(user.id) : true;

  const matchesSearchQuery = (request: RequestRecord, query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    return (
      (request.studentName || "").toLowerCase().includes(normalizedQuery) ||
      String(eventTitleFromRecord(request)).toLowerCase().includes(normalizedQuery) ||
      (request.specialization || "").toLowerCase().includes(normalizedQuery) ||
      (request.status || "").toLowerCase().includes(normalizedQuery)
    );
  };

  const scopedRequests = requests.filter((request) => matchesSelectedEvent(request) && matchesCurrentUser(request));
  const filtered = scopedRequests.filter((request) => matchesSearchQuery(request, normalizedSearch));

  const { animatedIds: searchAnimatedIds, handleSearchSubmit } = useSearchSubmitFeedback({
    getMatches: (query) => scopedRequests.filter((request) => matchesSearchQuery(request, query)),
    getId: (request) => request.id,
    notFoundMessage: TEXT.requestNotFound,
    showToast,
  });

  const mapped: RequestTableRow[] = filtered.map((request) => ({
    id: request.id,
    studentName: request.studentName || "-",
    event: eventTitleFromRecord(request),
    specialization: request.specialization || "-",
    status: request.status || "-",
    raw: request,
  }));

  const analyticsStatuses: AnalyticsStatus[] = [
    { key: "submitted", label: REQUEST_STATUS.SUBMITTED, count: 0, color: "#6495ed", students: [] },
    { key: "testing", label: REQUEST_STATUS.TESTING, count: 0, color: "#f59e0b", students: [] },
    { key: "started", label: REQUEST_STATUS.STARTED, count: 0, color: "#22c55e", students: [] },
    { key: "other", label: TEXT.other, count: 0, color: "#94a3b8", students: [], showStatus: true },
  ];

  filtered.forEach((request) => {
    const status = String(request.status || "").trim();
    let target = analyticsStatuses[3];

    if (status === REQUEST_STATUS.SUBMITTED) target = analyticsStatuses[0];
    else if (status === REQUEST_STATUS.TESTING) target = analyticsStatuses[1];
    else if (status === REQUEST_STATUS.STARTED) target = analyticsStatuses[2];

    target.count += 1;
    target.students.push(request);
  });

  const totalRequests = filtered.length;
  const percentOfTotal = (count: number) => (totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0);
  const activeProgress = analyticsStatuses[0].count + analyticsStatuses[1].count + analyticsStatuses[2].count;
  const activePercent = percentOfTotal(activeProgress);
  const startedPercent = percentOfTotal(analyticsStatuses[2].count);
  const pageTitle = user?.role === "student" ? TEXT.myRequests : TEXT.requests;

  return (
    <div className="page page--events">
      <div className={`requests-toolbar${isOrganizer ? "" : " requests-toolbar--student"}`}>
        <h1 className="h1 requests-toolbar__title">{pageTitle}</h1>

        {isOrganizer && (
          <Segmented
            className="requests-view-toggle"
            size="large"
            shape="round"
            value={view}
            onChange={(value) => setView(value as RequestsView)}
            options={[
              { label: TEXT.list, value: "list" },
              { label: TEXT.diagram, value: "diagram" },
            ]}
          />
        )}

	        {isOrganizer && (
	          <div className="requests-toolbar__filters">
	            <Dropdown
	              menu={{ items: eventDropdownItems, onClick: handleEventMenuClick, selectedKeys: [String(selectedEventId)] }}
	              placement="bottom"
              trigger={["click"]}
            >
              <AppButton className="requests-event-dropdown">
                <span>{selectedEvent?.title || TEXT.allEvents}</span>
                <DownOutlined />
	              </AppButton>
	            </Dropdown>

	            <AppSearch
	              className="search-box"
	              placeholder={TEXT.search}
	              value={search}
	              onChange={(event) => setSearch(event.target.value)}
	              onSearch={handleSearchSubmit}
	            />
	          </div>
	        )}
	      </div>

      {view === "list" ? (
        <Table
          columns={[
            { key: "studentName", title: TEXT.studentName, width: "310px" },
            { key: "event", title: TEXT.event, width: "370px" },
            { key: "specialization", title: TEXT.specialization, width: "380px" },
            { key: "status", title: TEXT.status },
          ]}
          data={mapped}
          animatedIds={searchAnimatedIds}
          gridColumns="1.2fr 2fr 1.4fr 1fr"
          renderCell={(row: RequestTableRow, colKey: string) => {
            if (colKey !== "status") return undefined;

            if (user?.role === "organizer") {
              return (
                <AppSelect
                  className="status-select"
                  value={row.status || ""}
                  onChange={(value) => handleStatusChange(row.id, String(value))}
                  options={[
                    { value: "", label: "-" },
                    ...ORGANIZER_REQUEST_STATUSES.map((status) => ({ value: status, label: status })),
                  ]}
                />
              );
            }

		            if (user?.role === "student") {
		              const canWithdraw = row.status !== REQUEST_STATUS.STARTED;

	              return (
	                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
	                  <div>{row.status || "-"}</div>
	                  {canWithdraw && (
	                    <AppButton className="danger-outline" onClick={() => handleWithdraw(row.id)}>
	                      {TEXT.withdrawRequest}
	                    </AppButton>
	                  )}
	                </div>
	              );
	            }

            return <div>{row.status || "-"}</div>;
          }}
        />
      ) : (
        <section className="requests-analytics">
          <div className="requests-analytics__head">
            <div>
              <h2>{TEXT.requestsDiagram}</h2>
              <p>{TEXT.distribution}</p>
            </div>
            <div className="requests-analytics__total">
              <span>{totalRequests}</span>
              <small>{TEXT.total}</small>
            </div>
          </div>

          <div className="requests-analytics__summary">
            <div className="requests-analytics__summary-top">
              <span>{TEXT.keyStatuses}</span>
              <strong>{activePercent}%</strong>
            </div>
            <Progress
              percent={activePercent}
              success={{ percent: startedPercent }}
              showInfo={false}
              strokeColor="#6495ed"
              trailColor="#eef3ff"
            />
            <div className="requests-analytics__hint">
              {TEXT.greenSegment} "{REQUEST_STATUS.STARTED}".
            </div>
          </div>

          <div className="requests-analytics__grid">
            {analyticsStatuses.map((item) => {
              const percent = percentOfTotal(item.count);
              const isOpen = expandedStatusKeys.includes(item.key);

              return (
                <div className="requests-status-card" key={item.key}>
                  <div className="requests-status-card__top">
                    <span>{item.label}</span>
                    <div className="requests-status-card__actions">
                      <strong>{item.count}</strong>
                      <button
                        className={`requests-status-card__toggle${isOpen ? " is-open" : ""}`}
                        type="button"
                        onClick={() => toggleStatusList(item.key)}
                        aria-label={`${isOpen ? TEXT.hideStudents : TEXT.showStudents}: ${item.label}`}
                      >
                        <DownOutlined />
                      </button>
                    </div>
                  </div>
                  <Progress
                    percent={percent}
                    success={item.key === "started" ? { percent } : undefined}
                    showInfo={false}
                    strokeColor={item.color}
                    trailColor="#eef2f7"
                  />
                  <small>{percent}% {TEXT.percentOfTotal}</small>

                  {isOpen && (
                    <div className="requests-status-card__students">
                      {item.students.length > 0 ? (
                        item.students.map((request) => (
                          <div className="requests-status-card__student" key={request.id}>
                            <span className="requests-status-card__student-name">{request.studentName || "-"}</span>
                            {item.showStatus && (
                              <span className="requests-status-card__student-status">{request.status || "-"}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="requests-status-card__empty">{TEXT.noStudents}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title={TEXT.confirmAction}>
        <div className="confirm-body">
          <div className="confirm-text">{TEXT.withdrawConfirm}</div>
          <div className="confirm-actions">
            <AppButton className="close-btn" onClick={() => setConfirmOpen(false)}>
              {TEXT.cancel}
            </AppButton>
            <AppButton className="danger-outline" onClick={confirmWithdraw}>
              {TEXT.withdraw}
            </AppButton>
          </div>
        </div>
      </Modal>

      <Modal isOpen={transitionOpen} onClose={closeTransitionModal} title={pendingTransition?.title || TEXT.confirmation}>
        <div className="confirm-body">
          <div className="confirm-text">{pendingTransition?.message || TEXT.confirmActionText}</div>
          <div className="confirm-actions">
            <AppButton className="close-btn" onClick={closeTransitionModal}>
              {TEXT.cancel}
            </AppButton>
            <AppButton className="btn-send" onClick={confirmTransition}>
              {TEXT.confirm}
            </AppButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
