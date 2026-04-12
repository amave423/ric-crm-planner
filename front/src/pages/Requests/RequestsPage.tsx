import { useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { getRequests, removeRequest, updateRequestStatus } from "../../api/requests";
import TableHeader from "../../components/Layout/TableHeader";
import Modal from "../../components/Modal/Modal";
import Table from "../../components/Table/Table";
import { ORGANIZER_REQUEST_STATUSES, getRequestTransitionCopy } from "../../constants/requestProgress";
import { AuthContext } from "../../context/AuthContext";
import type { Request as RequestType } from "../../types/request";
import "../../styles/page-colors.scss";

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

function eventTitleFromRecord(request: RequestRecord) {
  return request.eventTitle || request.eventName || request.event || request.event_name || "-";
}

export default function RequestsPage() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemoveId, setToRemoveId] = useState<number | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);

  const load = useCallback(async () => {
    const loadedRequests = await getRequests({ ownerId: user?.id, role: user?.role }).catch(() => []);
    setRequests(Array.isArray(loadedRequests) ? (loadedRequests as RequestRecord[]) : []);
  }, [user?.id, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const filteredAll = !search.trim()
    ? requests
    : requests.filter(
        (request) =>
          (request.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
          String(eventTitleFromRecord(request)).toLowerCase().includes(search.toLowerCase())
      );

  const filtered =
    user?.role === "student"
      ? filteredAll.filter((request) => Number(request.ownerId) === Number(user.id))
      : filteredAll;

  const mapped: RequestTableRow[] = filtered.map((request) => ({
    id: request.id,
    studentName: request.studentName || "-",
    event: eventTitleFromRecord(request),
    specialization: request.specialization || "-",
    status: request.status || "-",
    raw: request,
  }));

  return (
    <div className="page page--events">
      <TableHeader title={<span>{user?.role === "student" ? "Мои заявки" : "Заявки"}</span>} search={search} onSearch={setSearch} />

      <Table
        columns={[
          { key: "studentName", title: "ФИО студента", width: "310px" },
          { key: "event", title: "Мероприятие", width: "370px" },
          { key: "specialization", title: "Специализация", width: "380px" },
          { key: "status", title: "Статус" },
        ]}
        data={mapped}
        gridColumns="1.2fr 2fr 1.4fr 1fr"
        renderCell={(row: RequestTableRow, colKey: string) => {
          if (colKey !== "status") return undefined;

          if (user?.role === "organizer") {
            return (
              <select className="status-select" value={row.status || ""} onChange={(event) => handleStatusChange(row.id, event.target.value)}>
                <option value="">-</option>
                {ORGANIZER_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            );
          }

          if (user?.role === "student" && client.USE_MOCK) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                <div>{row.status || "-"}</div>
                <button className="danger-outline" onClick={() => handleWithdraw(row.id)}>
                  Отозвать заявку
                </button>
              </div>
            );
          }

          return <div>{row.status || "-"}</div>;
        }}
      />

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите действие">
        <div className="confirm-body">
          <div className="confirm-text">Вы уверены, что хотите отозвать заявку?</div>
          <div className="confirm-actions">
            <button className="close-btn" onClick={() => setConfirmOpen(false)}>
              Отмена
            </button>
            <button className="danger-outline" onClick={confirmWithdraw}>
              Отозвать
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={transitionOpen} onClose={closeTransitionModal} title={pendingTransition?.title || "Подтверждение"}>
        <div className="confirm-body">
          <div className="confirm-text">{pendingTransition?.message || "Подтвердите действие."}</div>
          <div className="confirm-actions">
            <button className="close-btn" onClick={closeTransitionModal}>
              Отмена
            </button>
            <button className="btn-send" onClick={confirmTransition}>
              Подтвердить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

