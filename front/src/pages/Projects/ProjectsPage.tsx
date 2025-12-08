import { useState } from "react";
import rawData from "../../mock-data/projects.json";
import { loadData, saveData } from "../../utils/storage";

import TableHeader from "../../components/Layout/TableHeader";
import Table from "../../components/Table/Table";
import Modal from "../../components/UI/Modal";
import CreateForm from "../../components/Forms/CreateForm";
import EditForm from "../../components/Forms/EditForm";
import "../../styles/page-colors.scss";

interface Project {
  id: number;
  title: string;
  event?: string;
  direction?: string;
  curator?: string;
  teams?: string;
  organization?: string;
  status?: string;
  description?: string;
}

export default function ProjectsPage() {
  const [tab, setTab] = useState("projects");
  const [search, setSearch] = useState("");

  const [modalCreate, setModalCreate] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);

  const [items, setItems] = useState<Project[]>(
    loadData<Project>("projects", rawData)
  );

  const filtered = items.filter((e) =>
    (e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const createItem = (data: any) => {
    const newItem: Project = { id: Date.now(), ...data };
    const updated = [...items, newItem];
    setItems(updated);
    saveData("projects", updated);
    setModalCreate(false);
  };

  const saveEdit = (updatedItem: Project) => {
    const updated = items.map((e) => (e.id === updatedItem.id ? updatedItem : e));
    setItems(updated);
    saveData("projects", updated);
    setModalEdit(false);
  };

  return (
    <div className="page page--projects">
      <TableHeader
        title="Проекты"
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
          { key: "direction", title: "Направление" },
          { key: "curator", title: "Куратор" },
          { key: "teams", title: "Команды" }
        ]}
        data={filtered}
        badgeKeys={["event", "direction"]}
        onInfoClick={(row) => {
          setEditItem(row);
          setModalEdit(true);
        }}
      />

      <Modal open={modalCreate} onClose={() => setModalCreate(false)}>
        <h2 className="h2">Создать проект</h2>
        <CreateForm
          fields={[
            { key: "title", label: "Название" },
            { key: "event", label: "Мероприятие" },
            { key: "direction", label: "Направление" },
            { key: "curator", label: "Куратор" },
            { key: "teams", label: "Команды" },
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
              { key: "direction", label: "Направление" },
              { key: "curator", label: "Куратор" },
              { key: "teams", label: "Команды" },
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
