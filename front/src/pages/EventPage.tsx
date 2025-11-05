import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function EventPage() {
  const { id } = useParams();

  useEffect(() => {
    document.title = `Мероприятие ${id} — MeetPoint`;
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Мероприятие #{id}</h2>
      <p>Детальная страница мероприятия — пока заглушка.</p>
    </div>
  );
}
