import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  useEffect(() => {
    document.title = 'Проекты — MeetPoint';
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Проекты</h2>
      <p>Здесь позже будет список проектов.</p>
    </div>
  );
}
