import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProfilePage() {
  const { id } = useParams();

  useEffect(() => {
    document.title = `Профиль ${id} — MeetPoint`;
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Профиль пользователя #{id}</h2>
      <p>Страница профиля — заглушка.</p>
    </div>
  );
}
