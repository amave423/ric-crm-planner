import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/ToastProvider";
import "../../styles/auth.scss";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(email.trim(), password);
    if (!ok) {
      showToast("error", "Неверный email или пароль (проверь тестовые данные или зарегистрируйся)");
      return;
    }
    navigate("/events");
  };

  return (
    <div className="auth-container">
      <h2 className="h1">Вход</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="text-small">Email</label>
        <input
          type="email"
          placeholder="email@mail.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-regular"
          required
        />

        <label className="text-small">Пароль</label>
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="text-regular"
          required
        />

        <button type="submit" className="auth-submit text-regular">Войти</button>
      </form>

      <p className="switch-link text-small">
        Еще нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
