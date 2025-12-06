import projects from "../../mock-data/projects.json";
import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";

export default function ProjectsPage() {
  const columns = [
    { key: "name", title: "Название" },
    { key: "direction", title: "Направление" },
    { key: "teams", title: "Команд" },
    { key: "curator", title: "Куратор" }
  ];

  return (
    <div className="page">
      <TableHeader title="Проекты" search="" onSearch={() => {}} />
      <Table columns={columns} data={projects} />
    </div>
  );
}
