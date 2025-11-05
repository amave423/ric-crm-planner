import { useEffect } from 'react';

export default function AboutPage() {
	useEffect(() => {
		document.title = 'MeetPoint — О проекте';
	}, []);

	return (
		<div style={{ padding: 40 }}>
			<h2>О проекте</h2>
			<p>Здесь будет информация о проекте. Пока — заглушка.</p>
		</div>
	);
}
