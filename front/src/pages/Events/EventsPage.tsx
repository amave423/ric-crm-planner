import { useState } from "react";
import events from "../../mock-data/events.json";
import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import Modal from "../../components/Modal/Modal";
import EditForm from "../../components/Forms/EditForm";

export default function EventsPage() {
  const [tab, setTab] = useState("events");
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null as any);

  const [search, setSearch] = useState("");

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <TableHeader
        title="Мероприятия"
        search={search}
        onSearch={setSearch}
        active={tab}
        onChangeTab={setTab}
      />

      <Table
        columns={[
          { key: "name", title: "Название" },
          { key: "start", title: "Дата начала мероприятия" },
          { key: "end", title: "Дата окончания мероприятия" },
          { key: "organizer", title: "Организатор" },
          { key: "status", title: "Статус мероприятия" },
        ]}
        data={filtered}
        onRowClick={(row) => {
          setEditItem(row);
          setModal(true);
        }}
      />

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Редактирование">
        {editItem && (
          <EditForm
            fields={[
              { key: "name", label: "Название" },
              { key: "start", label: "Дата начала" },
              { key: "end", label: "Дата окончания" },
              { key: "organizer", label: "Организатор" },
              { key: "status", label: "Статус" },
              { key: "description", label: "Описание", type: "textarea" },
            ]}
            initial={editItem}
            onSave={(v) => console.log(v)}
          />
        )}
      </Modal>
    </div>
  );
}
