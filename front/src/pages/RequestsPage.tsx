import { useEffect } from 'react';

export default function RequestsPage() {
  useEffect(() => {
    document.title = 'Заявки — MeetPoint';
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Заявки</h2>
      <p>Здесь позже будет управление заявками.</p>
    </div>
  );
}
