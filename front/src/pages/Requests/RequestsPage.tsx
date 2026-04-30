import { useCallback, useContext, useEffect, useState } from "react";
import { Checkbox, Dropdown, Progress, Segmented, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, SettingFilled } from "@ant-design/icons";
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
  myRequests: "Мои заявки",
  requests: "Заявки",
  list: "Список",
  diagram: "Диаграмма",
  search: "Поиск...",
  studentName: "ФИО студента",
  event: "Мероприятие",
  specialization: "Специализация",
  status: "Статус",
  withdrawRequest: "Отозвать заявку",
  other: "Остальные",
  requestsDiagram: "Диаграмма заявок",
  distribution:
    "Распределение студентов по текущим статусам",
  total: "всего",
  keyStatuses: "Ключевые статусы",
  activeRequests: "Активные заявки",
  statusDistribution:
    "Расклад по статусам",
  circleDiagram: "Круговая",
  lineDiagram: "Линейная",
  statusDisplaySettings:
    "Настройка отображения статусов",
  statusDisplayDescription:
    "Выбранные статусы отображаются отдельно. Невыбранные статусы попадут в \"Остальные\".",
  selectAllStatuses:
    "Выбрать все",
  ready: "Готово",
  colorHint:
    "Цвета на диаграмме совпадают со статусами заявок.",
  percentOfTotal:
    "от общего количества",
  confirmAction:
    "Подтвердите действие",
  withdrawConfirm:
    "Вы уверены, что хотите отозвать заявку?",
  cancel: "Отмена",
  withdraw: "Отозвать",
  confirmation:
    "Подтверждение",
  confirmActionText:
    "Подтвердите действие.",
  confirm:
    "Подтвердить",
  allEvents:
    "Все мероприятия",
  noStudents:
    "Нет студентов",
  showStudents:
    "Показать студентов",
  hideStudents:
    "Скрыть студентов",
  requestNotFound:
    "Такой заявки не существует!",
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
type RequestsChartView = "circle" | "line";
type EventFilter = number | "all";
type AnalyticsStatusKey = string;

const CHART_VIEW_STORAGE_KEY = "requests-chart-view";
const REQUESTS_VIEW_STORAGE_KEY = "requests-view";
const DISPLAYED_STATUSES_STORAGE_KEY = "requests-displayed-statuses";
const DASHBOARD_START_ANGLE = 225;
const DASHBOARD_SWEEP_ANGLE = 270;
const OTHER_STATUS_KEY = "other";
const OTHER_STATUS_COLOR = "#94a3b8";
const REQUEST_STATUS_COLORS: Record<string, string> = {
  [REQUEST_STATUS.SUBMITTED]: "#6495ed",
  [REQUEST_STATUS.TESTING]: "#f59e0b",
  [REQUEST_STATUS.JOINED_CHAT]: "#14b8a6",
  [REQUEST_STATUS.STARTED]: "#22c55e",
};

function isRequestsChartView(value: string | null): value is RequestsChartView {
  return value === "circle" || value === "line";
}

function isRequestsView(value: string | null): value is RequestsView {
  return value === "list" || value === "diagram";
}

function readDisplayedStatuses() {
  const fallback = [...ORGANIZER_REQUEST_STATUSES];
  const savedStatuses = window.localStorage.getItem(DISPLAYED_STATUSES_STORAGE_KEY);
  if (!savedStatuses) return fallback;

  try {
    const parsed = JSON.parse(savedStatuses);
    if (!Array.isArray(parsed)) return fallback;

    return ORGANIZER_REQUEST_STATUSES.filter((status) => parsed.includes(status));
  } catch {
    return fallback;
  }
}

function getArcPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function getArcPath(startAngle: number, endAngle: number) {
  const start = getArcPoint(100, 100, 72, endAngle);
  const end = getArcPoint(100, 100, 72, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A 72 72 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

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

function isOrganizerRole(role?: string) {
  const normalized = String(role || "").toLowerCase();
  return normalized === "organizer" || normalized.includes("admin") || normalized.includes("curator");
}

function isProjectantRole(role?: string) {
  const normalized = String(role || "").toLowerCase();
  return normalized === "student" || normalized.includes("project");
}

export default function RequestsPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isOrganizer = isOrganizerRole(user?.role);
  const isProjectant = isProjectantRole(user?.role);

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<EventFilter>("all");
  const [expandedStatusKeys, setExpandedStatusKeys] = useState<AnalyticsStatusKey[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemoveId, setToRemoveId] = useState<number | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);
  const [view, setView] = useState<RequestsView>(() => {
    const savedView = window.localStorage.getItem(REQUESTS_VIEW_STORAGE_KEY);
    return isRequestsView(savedView) ? savedView : "list";
  });
  const [chartView, setChartView] = useState<RequestsChartView>(() => {
    const savedView = window.localStorage.getItem(CHART_VIEW_STORAGE_KEY);
    return isRequestsChartView(savedView) ? savedView : "circle";
  });
  const [statusSettingsOpen, setStatusSettingsOpen] = useState(false);
  const [displayedStatuses, setDisplayedStatuses] = useState<string[]>(readDisplayedStatuses);

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
    window.localStorage.setItem(CHART_VIEW_STORAGE_KEY, chartView);
  }, [chartView]);

  useEffect(() => {
    window.localStorage.setItem(REQUESTS_VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(DISPLAYED_STATUSES_STORAGE_KEY, JSON.stringify(displayedStatuses));
    setExpandedStatusKeys((current) =>
      current.filter((key) => key === OTHER_STATUS_KEY || displayedStatuses.includes(key))
    );
  }, [displayedStatuses]);

  useEffect(() => {
    if (!isProjectant) return;

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
  }, [isProjectant, location.search, navigate]);

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

  const toggleDisplayedStatus = (status: string, checked: boolean) => {
    setDisplayedStatuses((current) => {
      const selected = new Set(current);
      if (checked) selected.add(status);
      else selected.delete(status);

      return ORGANIZER_REQUEST_STATUSES.filter((item) => selected.has(item));
    });
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

  const matchesCurrentUser = (request: RequestRecord) => {
    if (!isProjectant) return true;
    if (!user?.id) return false;
    return Number(request.ownerId) === Number(user.id);
  };

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

  const displayedStatusSet = new Set(displayedStatuses);
  const statusCounts = ORGANIZER_REQUEST_STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  filtered.forEach((request) => {
    const status = String(request.status || "").trim();
    if (status in statusCounts) statusCounts[status] += 1;
  });

  const analyticsStatuses: AnalyticsStatus[] = [
    ...ORGANIZER_REQUEST_STATUSES.filter((status) => displayedStatusSet.has(status)).map((status) => ({
      key: status,
      label: status,
      count: 0,
      color: REQUEST_STATUS_COLORS[status] || OTHER_STATUS_COLOR,
      students: [],
    })),
    { key: OTHER_STATUS_KEY, label: TEXT.other, count: 0, color: OTHER_STATUS_COLOR, students: [], showStatus: true },
  ];
  const otherStatus = analyticsStatuses[analyticsStatuses.length - 1];

  filtered.forEach((request) => {
    const status = String(request.status || "").trim();
    const target = analyticsStatuses.find((item) => item.key === status) || otherStatus;

    target.count += 1;
    target.students.push(request);
  });

  const totalRequests = filtered.length;
  const percentOfTotal = (count: number) => (totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0);
  const statusSegments = analyticsStatuses.map((item) => ({
    ...item,
    percent: totalRequests > 0 ? (item.count / totalRequests) * 100 : 0,
    roundedPercent: percentOfTotal(item.count),
  }));
  const visibleStatusSegments = statusSegments.filter((item) => item.count > 0);
  let dashboardAngle = DASHBOARD_START_ANGLE;
  const dashboardSegments = visibleStatusSegments.map((item) => {
    const sweep = (item.percent / 100) * DASHBOARD_SWEEP_ANGLE;
    const gap = Math.min(2.4, sweep / 4);
    const startAngle = dashboardAngle;
    const endAngle = dashboardAngle + sweep;
    dashboardAngle = endAngle;

    return {
      ...item,
      path: getArcPath(startAngle + gap, endAngle - gap),
    };
  });
  const visibleView = isOrganizer ? view : "list";
  const pageTitle = isProjectant ? TEXT.myRequests : TEXT.requests;

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

      {visibleView === "list" ? (
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

		            if (isProjectant) {
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
	          <div className={`requests-analytics__hero requests-analytics__hero--${chartView}`}>
	            <div className="requests-analytics__copy">
	              <h2>{TEXT.requestsDiagram}</h2>
	              <p>{TEXT.distribution}</p>
	              <Segmented
	                className="requests-chart-toggle"
	                size="large"
	                shape="round"
	                value={chartView}
	                onChange={(value) => setChartView(value as RequestsChartView)}
                options={[
                  { label: TEXT.circleDiagram, value: "circle" },
                  { label: TEXT.lineDiagram, value: "line" },
	                ]}
	              />
                <AppButton className="requests-status-settings-btn" onClick={() => setStatusSettingsOpen(true)}>
                  <SettingFilled />
                  <span>{TEXT.statusDisplaySettings}</span>
                </AppButton>
		            </div>
	
	            {chartView === "circle" ? (
		              <div className="requests-analytics__dashboard">
                  <div className="requests-analytics__dashboard-chart">
                    <svg className="requests-analytics__dashboard-svg" viewBox="0 0 200 170" aria-label={TEXT.requestsDiagram}>
                      <path className="requests-analytics__dashboard-trail" d={getArcPath(DASHBOARD_START_ANGLE, DASHBOARD_START_ANGLE + DASHBOARD_SWEEP_ANGLE)} />
                      {dashboardSegments.map((item) => (
                        <Tooltip
                          key={item.key}
                          title={`${item.label}: ${item.count} ${TEXT.total}, ${item.roundedPercent}% ${TEXT.percentOfTotal}`}
                        >
                          <path className="requests-analytics__dashboard-segment" d={item.path} stroke={item.color} />
                        </Tooltip>
                      ))}
                    </svg>
                    <div className="requests-analytics__dashboard-label">
                      <strong>{totalRequests}</strong>
                      <span>{TEXT.total}</span>
                    </div>
                  </div>
                  <div className="requests-analytics__line-labels requests-analytics__line-labels--dashboard">
                    {visibleStatusSegments.map((item) => (
                      <span key={item.key} style={{ ["--status-color" as string]: item.color }}>
                        {item.label}
                        <strong>{item.roundedPercent}%</strong>
                      </span>
                    ))}
                  </div>
		              </div>
		            ) : (
	              <div className="requests-analytics__linear-summary">
	                <div className="requests-analytics__summary-top">
	                  <span>{TEXT.total}</span>
	                  <strong>{totalRequests}</strong>
	                </div>
	                <div className="requests-analytics__stacked-bar" role="img" aria-label={TEXT.statusDistribution}>
	                  {visibleStatusSegments.map((item) => (
	                    <Tooltip
	                      key={item.key}
	                      title={`${item.label}: ${item.count} ${TEXT.total}, ${item.roundedPercent}% ${TEXT.percentOfTotal}`}
                    >
                      <span
                        style={{
                          width: `${item.percent}%`,
                          minWidth: item.count > 0 ? 10 : 0,
                          backgroundColor: item.color,
                        }}
	                      />
	                    </Tooltip>
	                  ))}
	                </div>
                  <div className="requests-analytics__line-labels">
                    {visibleStatusSegments.map((item) => (
                      <span key={item.key} style={{ ["--status-color" as string]: item.color }}>
                        {item.label}
                        <strong>{item.roundedPercent}%</strong>
                      </span>
                    ))}
                  </div>
	              </div>
	            )}
	          </div>

		          <div className="requests-analytics__grid">
            {analyticsStatuses.map((item) => {
              const percent = percentOfTotal(item.count);
              const isOpen = expandedStatusKeys.includes(item.key);

              return (
                <div className="requests-status-card" key={item.key} style={{ ["--status-color" as string]: item.color }}>
                  <div className="requests-status-card__top">
                    <span className="requests-status-card__label-dot">
                      {item.label}
                    </span>
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

                  {chartView === "circle" ? (
                    <Tooltip title={`${item.count} ${TEXT.total}, ${percent}% ${TEXT.percentOfTotal}`}>
                      <div className="requests-status-card__circle">
                        <Progress
                          type="circle"
                          percent={percent}
                          strokeColor={item.color}
                          trailColor="#edf2f7"
                          strokeWidth={10}
                          size={104}
	                          format={() => (
	                            <div className="requests-status-card__circle-label">
	                              <strong>{percent}%</strong>
	                            </div>
	                          )}
                        />
                      </div>
                    </Tooltip>
                  ) : (
                    <div className="requests-status-card__bar">
                      <Progress
                        percent={percent}
                        showInfo={false}
                        strokeColor={item.color}
                        trailColor="#eef2f7"
                        strokeWidth={10}
                      />
                    </div>
                  )}
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

      <Modal
        isOpen={statusSettingsOpen}
        onClose={() => setStatusSettingsOpen(false)}
        title={TEXT.statusDisplaySettings}
      >
        <div className="requests-status-settings">
          <p>{TEXT.statusDisplayDescription}</p>
          <div className="requests-status-settings__list">
            {ORGANIZER_REQUEST_STATUSES.map((status) => (
              <label
                className="requests-status-settings__option"
                key={status}
                style={{ ["--status-color" as string]: REQUEST_STATUS_COLORS[status] || OTHER_STATUS_COLOR }}
              >
                <Checkbox
                  checked={displayedStatuses.includes(status)}
                  onChange={(event) => toggleDisplayedStatus(status, event.target.checked)}
                >
                  {status}
                </Checkbox>
                <span>{statusCounts[status] || 0}</span>
              </label>
            ))}
          </div>
          <div className="confirm-actions">
            <AppButton className="close-btn" onClick={() => setDisplayedStatuses([...ORGANIZER_REQUEST_STATUSES])}>
              {TEXT.selectAllStatuses}
            </AppButton>
            <AppButton className="btn-send" onClick={() => setStatusSettingsOpen(false)}>
              {TEXT.ready}
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
