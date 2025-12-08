import { useState } from "react";
import rawData from "../../mock-data/directions.json";
import { loadData, saveData } from "../../utils/storage";

import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import Modal from "../../components/UI/Modal";
import CreateForm from "../../components/Forms/CreateForm";
import EditForm from "../../components/Forms/EditForm";
import "../../styles/page-colors.scss";

interface Direction {
  id: number;
  title: string;
  event?: string;
  projects?: string;
  curator?: string;
  status?: string;
  description?: string;
}

export default function DirectionsPage() {
  const [tab, setTab] = useState("directions");
  const [search, setSearch] = useState("");

  const [modalCreate, setModalCreate] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [editItem, setEditItem] = useState<Direction | null>(null);

  const [items, setItems] = useState<Direction[]>(
    loadData<Direction>("directions", rawData)
  );

  const filtered = items.filter((e) =>
    (e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const createItem = (data: any) => {
    const newItem: Direction = { id: Date.now(), ...data };
    const updated = [...items, newItem];
    setItems(updated);
    saveData("directions", updated);
    setModalCreate(false);
  };

  const saveEdit = (updatedItem: Direction) => {
    const updated = items.map((e) => (e.id === updatedItem.id ? updatedItem : e));
    setItems(updated);
    saveData("directions", updated);
    setModalEdit(false);
  };

  return (
    <div className="page page--directions">
      <TableHeader
        title="Направления"
        search={search}
        onSearch={setSearch}
        active={tab}
        onChangeTab={setTab}
        onCreate={() => setModalCreate(true)}
      />

      <Table
        columns={[
          { key: "title", title: "Название" },
          { key: "event", title: "Мероприятие" },
          { key: "projects", title: "Проекты" },
          { key: "curator", title: "Организатор" }
        ]}
        data={filtered}
        badgeKeys={["event", "projects"]}
        onInfoClick={(row) => {
          setEditItem(row);
          setModalEdit(true);
        }}
      />

      <Modal open={modalCreate} onClose={() => setModalCreate(false)}>
        <h2 className="h2">Создать направление</h2>
        <CreateForm
          fields={[
            { key: "title", label: "Название" },
            { key: "event", label: "Мероприятие" },
            { key: "projects", label: "Проекты" },
            { key: "curator", label: "Куратор" },
            { key: "status", label: "Статус" },
            { key: "description", label: "Описание", type: "textarea" }
          ]}
          onCreate={createItem}
        />
      </Modal>

      <Modal open={modalEdit} onClose={() => setModalEdit(false)}>
        <h2 className="h2">Редактировать</h2>
        {editItem && (
          <EditForm
            fields={[
              { key: "title", label: "Название" },
              { key: "event", label: "Мероприятие" },
              { key: "projects", label: "Проекты" },
              { key: "curator", label: "Куратор" },
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