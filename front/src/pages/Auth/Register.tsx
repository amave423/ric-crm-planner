import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/auth.scss";

export default function Register() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    name: "",
    surname: "",
    password: "",
    confirm: "",
    role: "student"
  });

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      alert("Пароли не совпадают");
      return;
    }

    register({
      email: form.email.trim(),
      name: form.name.trim(),
      surname: form.surname.trim(),
      role: form.role,
      password: form.password
    });

    navigate("/events");
  };

  return (
    <div className="auth-container">
      <h2 className="h1">Регистрация</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="text-small">Email</label>
        <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="text-regular" />

        <label className="text-small">Имя</label>
        <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} className="text-regular" />

        <label className="text-small">Фамилия</label>
        <input type="text" required value={form.surname} onChange={(e) => update("surname", e.target.value)} className="text-regular" />

        <label className="text-small">Пароль</label>
        <input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} className="text-regular" />

        <label className="text-small">Подтвердите пароль</label>
        <input type="password" required value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="text-regular" />

        <button type="submit" className="auth-submit text-regular">Зарегистрироваться</button>
      </form>

      <p className="switch-link text-small">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
