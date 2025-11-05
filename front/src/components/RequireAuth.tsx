import { Navigate, useLocation } from 'react-router-dom';

interface RequireAuthProps {
  isAuthenticated: boolean;
  children: JSX.Element;
}

/**
 * Компонент для проверки аутентификации пользователя.
 * Если пользователь не аутентифицирован, перенаправляет на страницу входа.
 */
export default function RequireAuth({ isAuthenticated, children }: RequireAuthProps) {
  const location = useLocation();
  if (!isAuthenticated) {
    // Передаём исходное место в state, чтобы после логина можно было вернуться
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
