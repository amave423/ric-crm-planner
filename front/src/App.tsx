import './App.scss';
import { useEffect, useState } from 'react';
import TopHeader from './components/TopHeader';
import Hero from './components/Hero';
import Opportunities from './components/Opportunities';
import Advantages from './components/Advantages';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import AboutPage from './pages/AboutPage';
import UsersProfilePage from './pages/UsersProfilePage';
import RequireAuth from './components/RequireAuth';
import EventsPage from './pages/EventsPage';
import ProjectsPage from './pages/ProjectsPage';
import RequestsPage from './pages/RequestsPage';
import DirectionsPage from './pages/DirectionsPage';
import EventPage from './pages/EventPage';
import ProjectPage from './pages/ProjectPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/Sidebar';

export default function App() {
  useEffect(() => {
    document.title = 'MeetPoint';
  }, []);

  const isAuthenticated = !!localStorage.getItem('user');

  // управление открытием сайдбара
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(prev => !prev);

  // блокируем скролл страницы при открытом меню
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }, [menuOpen]);

  return (
    <Router>
      <TopHeader menuOpen={menuOpen} onToggleMenu={toggleMenu} />
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <Routes>
        {/* если авторизован — корень ведёт на /events, иначе — главная страница */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/events" replace /> : <MainPage />}
        />
        <Route path="/login" element={<LoginPage />} />

        {/* публичные страницы */}
        <Route path="/about" element={<AboutPage />} />

        {/* основные разделы */}
        <Route path="/events" element={<EventsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/directions" element={<DirectionsPage />} />

        {/* детальные страницы */}
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />

        {/* защищённые примеры */}
        <Route
          path="/about-protected"
          element={
            <RequireAuth isAuthenticated={isAuthenticated}>
              <AboutPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth isAuthenticated={isAuthenticated}>
              <UsersProfilePage />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}
