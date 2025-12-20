import { useContext, useEffect, useState } from "react";
import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";
import { getRequests, updateRequestStatus, removeRequest } from "../../api/requests";
import { getEventById } from "../../api/events";
import { AuthContext } from "../../context/AuthContext";
import Modal from "../../components/Modal/Modal";
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
  "Отказался от ПШ"
];

export default function RequestsPage() {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemoveId, setToRemoveId] = useState<number | null>(null);

  const load = () => {
    const rs = getRequests();
    setRequests(rs);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = (id: number, status: string) => {
    updateRequestStatus(id, status);
    load();
  };

  const handleWithdraw = (id: number) => {
    setToRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmWithdraw = () => {
    if (toRemoveId != null) {
      removeRequest(toRemoveId);
      setConfirmOpen(false);
      setToRemoveId(null);
      load();
    }
  };

  const filteredAll = !search.trim()
    ? requests
    : requests.filter((r) =>
        (r.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.projectTitle || "").toLowerCase().includes(search.toLowerCase()) ||
        String(getEventById(r.eventId)?.title || "").toLowerCase().includes(search.toLowerCase())
      );

  const filtered = user?.role === "student" ? filteredAll.filter((r) => r.ownerId === user.id) : filteredAll;

  const mapped = filtered.map((r) => ({
    id: r.id,
    studentName: r.studentName,
    event: getEventById(r.eventId)?.title || "—",
    project: r.projectTitle || "—",
    specialization: r.specialization || "—",
    status: r.status || "—",
    raw: r
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
          { key: "status", title: user?.role === "student" ? "Действие" : "Статус"}
        ]}
        data={mapped}
        renderCell={(row: any, colKey: string) => {
          if (colKey !== "status") return undefined;

          if (user?.role === "organizer") {
            return (
              <select className="status-select" value={row.status || ""} onChange={(e) => handleStatusChange(row.id, e.target.value)}>
                <option value="">—</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            );
          }

          if (user?.role === "student") {
            return (
              <div>
                <button className="danger-outline" onClick={() => handleWithdraw(row.id)}>Отозвать заявку</button>
              </div>
            );
          }

          return <div>{row.status}</div>;
        }}
      />

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Подтвердите">
        <div className="confirm-body">
            <div className="confirm-text">Вы уверены, что хотите отозвать заявку?</div>
            <div className="confirm-actions">
              <button className="close-btn" onClick={() => setConfirmOpen(false)}>Отмена</button>
              <button className="danger-outline" onClick={confirmWithdraw}>Отозвать</button>
            </div>
        </div>
      </Modal>
    </div>
  );
}