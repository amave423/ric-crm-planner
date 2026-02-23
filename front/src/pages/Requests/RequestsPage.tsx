import { useContext, useEffect, useState, useCallback } from "react";
import client from "../../api/client";
import { getRequests, removeRequest, updateRequestStatus } from "../../api/requests";
import TableHeader from "../../components/Layout/TableHeader";
import Modal from "../../components/Modal/Modal";
import Table from "../../components/Table/Table";
import { AuthContext } from "../../context/AuthContext";
import type { Request as RequestType } from "../../types/request";
import "../../styles/page-colors.scss";

const STATUSES = [
  "Прислал заявку",
  "Прохождение тестирования",
  "Отправлена ссылка на орг. чат",
  "Добавился в орг. чат",
  "Приступил к ПШ",
  "Не перешел к тестированию",
  "Не прошел к тестирование",
  "Не добавился в орг. чат",
  "Удален с ПШ",
  "Отказался от ПШ",
];

type RequestRecord = RequestType & {
  eventName?: string;
  event?: string;
  event_name?: string;
};

type RequestTableRow = {
  id: number;
  studentName: string;
  event: string;
  project: string;
  specialization: string;
  status: string;
  raw: RequestRecord;
};

export default function RequestsPage() {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemoveId, setToRemoveId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const rs = await getRequests({ ownerId: user?.id, role: user?.role }).catch(() => []);
    setRequests(Array.isArray(rs) ? (rs as RequestRecord[]) : []);
  }, [user?.id, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (toRemoveId != null) {
      try {
        await removeRequest(toRemoveId);
      } finally {
        setConfirmOpen(false);
        setToRemoveId(null);
        await load();
      }
    }
  };

  const eventTitleFromRecord = (r: RequestRecord) => r.eventTitle || r.eventName || r.event || r.event_name || "—";

  const filteredAll = !search.trim()
    ? requests
    : requests.filter(
        (r) =>
          (r.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
          (r.projectTitle || "").toLowerCase().includes(search.toLowerCase()) ||
          String(eventTitleFromRecord(r)).toLowerCase().includes(search.toLowerCase())
      );

  const filtered = user?.role === "student" ? filteredAll.filter((r) => Number(r.ownerId) === Number(user.id)) : filteredAll;

  const mapped: RequestTableRow[] = filtered.map((r) => ({
    id: r.id,
    studentName: r.studentName || "—",
    event: eventTitleFromRecord(r),
    project: r.projectTitle || "—",
    specialization: r.specialization || "—",
    status: r.status || "—",
    raw: r,
  }));

  return (
    <div className="page page--events">
      <TableHeader title={<span>{user?.role === "student" ? "Мои заявки" : "Заявки"}</span>} search={search} onSearch={setSearch} />

      <Table
        columns={[
          { key: "studentName", title: "ФИО студента", width: "310px" },
          { key: "event", title: "Мероприятие", width: "370px" },
          { key: "project", title: "Проект", width: "450px" },
          { key: "specialization", title: "Специализация", width: "380px" },
          { key: "status", title: user?.role === "student" ? "Действие" : "Статус" },
        ]}
        data={mapped}
        renderCell={(row: RequestTableRow, colKey: string) => {
          if (colKey !== "status") return undefined;

          if (user?.role === "organizer") {
            return (
              <select className="status-select" value={row.status || ""} onChange={(e) => handleStatusChange(row.id, e.target.value)}>
                <option value="">—</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            );
          }

          if (user?.role === "student" && client.USE_MOCK) {
            return (
              <div>
                <button className="danger-outline" onClick={() => handleWithdraw(row.id)}>
                  Отозвать заявку
                </button>
              </div>
            );
          }

          return <div>{row.status || "—"}</div>;
        }}
      />

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите">
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
    </div>
  );
}
