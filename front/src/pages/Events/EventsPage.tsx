import { useState } from "react";
import rawEvents from "../../mock-data/events.json";
import { loadData, saveData } from "../../utils/storage";

import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import Modal from "../../components/UI/Modal";
import CreateForm from "../../components/Forms/CreateForm";
import EditForm from "../../components/Forms/EditForm";
import "../../styles/page-colors.scss";

interface EventItem {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  organizer: string;
  status: string;
  description?: string;
}

export default function EventsPage() {
  const [tab, setTab] = useState("events");
  const [search, setSearch] = useState("");

  const [modalCreate, setModalCreate] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [editItem, setEditItem] = useState<EventItem | null>(null);

  const [events, setEvents] = useState<EventItem[]>(
    loadData<EventItem>("events", rawEvents)
  );

  const filtered = events.filter((e) =>
    (e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const createEvent = (data: any) => {
    const newItem: EventItem = { id: Date.now(), ...data };
    const updated = [...events, newItem];
    setEvents(updated);
    saveData("events", updated);
    setModalCreate(false);
  };

  const saveEdit = (updatedItem: EventItem) => {
    const updated = events.map((e) => (e.id === updatedItem.id ? updatedItem : e));
    setEvents(updated);
    saveData("events", updated);
    setModalEdit(false);
  };

  return (
    <div className="page page--events">
      <TableHeader
        title="Мероприятия"
        search={search}
        onSearch={setSearch}
        active={tab}
        onChangeTab={setTab}
        onCreate={() => setModalCreate(true)}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "startDate", title: "Дата начала мероприятия" },
          { key: "endDate", title: "Дата окончания мероприятия" },
          { key: "organizer", title: "Организатор" },
          { key: "status", title: "Статус мероприятия" }
        ]}
        data={filtered}
        badgeKeys={["startDate", "endDate", "status"]}
        onInfoClick={(row) => {
          setEditItem(row);
          setModalEdit(true);
        }}
      />

      <Modal open={modalCreate} onClose={() => setModalCreate(false)}>
        <h2 className="h2">Создать мероприятие</h2>
        <CreateForm
          fields={[
            { key: "title", label: "Название" },
            { key: "startDate", label: "Дата начала", type: "date" },
            { key: "endDate", label: "Дата окончания", type: "date" },
            { key: "organizer", label: "Организатор" },
            { key: "status", label: "Статус" },
            { key: "description", label: "Описание", type: "textarea" }
          ]}
          onCreate={createEvent}
        />
      </Modal>

      <Modal open={modalEdit} onClose={() => setModalEdit(false)}>
        <h2 className="h2">Редактировать</h2>
        {editItem && (
          <EditForm
            fields={[
              { key: "title", label: "Название" },
              { key: "startDate", label: "Дата начала", type: "date" },
              { key: "endDate", label: "Дата окончания", type: "date" },
              { key: "organizer", label: "Организатор" },
              { key: "status", label: "Статус" },
              { key: "description", label: "Описание", type: "textarea" }
            ]}
            initial={editItem}
            onSave={saveEdit}
          />
        )}
      </Modal>
    </div>
  );
}
