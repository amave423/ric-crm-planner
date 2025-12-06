import directions from "../../mock-data/directions.json";
import Table from "../../components/Table/Table";
import TableHeader from "../../components/Layout/TableHeader";

export default function DirectionsPage() {
  const columns = [
    { key: "name", title: "Название" },
    { key: "event", title: "Мероприятие" },
    { key: "projects", title: "Проектов" },
    { key: "lead", title: "Руководитель" }
  ];

  return (
    <div className="page">
      <TableHeader title="Направления" search="" onSearch={() => {}} />
      <Table columns={columns} data={directions} />
    </div>
  );
}
