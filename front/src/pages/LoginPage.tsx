import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import users from '../data/users.json';

export default function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	// Получаем откуда пришли (если есть)
	const fromPath = (location.state as any)?.from?.pathname;

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	const handleLogin = () => {
		const user = users.find(u => u.username === username && u.password === password);
		if (user) {
			localStorage.setItem('user', JSON.stringify(user));
			// По умолчанию после логина переходим на /events (если не указан другой защищённый путь)
			const target = fromPath && fromPath !== '/login' ? fromPath : '/events';
			navigate(target, { replace: true });
		} else {
			setError('Неверное имя пользователя или пароль');
		}
	};

	useEffect(() => {
		document.title = 'MeetPoint — Вход';
	}, []);

	return (
		<div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ textAlign: 'center' }}>
				<h2>Вход</h2>
				<input
					type="text"
					placeholder="Имя пользователя"
					value={username}
					onChange={e => setUsername(e.target.value)}
					style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '200px' }}
				/>
				<input
					type="password"
					placeholder="Пароль"
					value={password}
					onChange={e => setPassword(e.target.value)}
					style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '200px' }}
				/>
				{error && <p style={{ color: 'red' }}>{error}</p>}
				<button className="PrimaryBtn" onClick={handleLogin}>
					Войти
				</button>
			</div>
		</div>
	);
}
