import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectPage() {
  const { id } = useParams();

  useEffect(() => {
    document.title = `Проект ${id} — MeetPoint`;
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Проект #{id}</h2>
      <p>Детальная страница проекта — пока заглушка.</p>
    </div>
  );
}
