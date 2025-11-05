import { Navigate } from 'react-router-dom';

interface RequireRoleProps {
  role: string;
  userRole: string;
  children: JSX.Element;
}

/**
 * Компонент для проверки роли пользователя.
 * Если роль не совпадает, перенаправляет на главную страницу.
 */
export default function RequireRole({ role, userRole, children }: RequireRoleProps) {
  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}
