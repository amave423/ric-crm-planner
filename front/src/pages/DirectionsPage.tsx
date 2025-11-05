import { useEffect } from 'react';

export default function DirectionsPage() {
  useEffect(() => {
    document.title = 'Направления — MeetPoint';
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Направления</h2>
      <p>Здесь позже будет управление направлениями.</p>
    </div>
  );
}
