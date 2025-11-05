import { useEffect } from 'react';

export default function UsersProfilePage() {
  useEffect(() => {
    document.title = 'Профиль пользователя';
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Профиль пользователя</h2>
      <p>Здесь будет информация о профиле пользователя.</p>
    </div>
  );
}
