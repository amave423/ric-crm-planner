import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function EventsPage() {
  useEffect(() => {
    document.title = 'Мероприятия — MeetPoint';
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Мероприятия</h2>
      <p>Здесь позже будет полный список мероприятий.</p>
    </div>
  );
}
