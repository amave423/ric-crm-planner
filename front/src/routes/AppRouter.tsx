import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";

import Header from "../components/Header/Header";

import EventsPage from "../features/events/pages/EventsPage";
import DirectionsPage from "../features/events/pages/DirectionsPage";
import ProjectsPage from "../features/events/pages/ProjectsPage";

import RequestsPage from "../features/requests/pages/RequestsPage";
import PlannerPage from "../features/planner/pages/PlannerPage";
import ArchivePage from "../features/events/pages/ArchivePage";
import ProfilePage from "../features/profile/ProfilePage";

import LoginPage from "../features/auth/Login";
import RegisterPage from "../features/auth/Register";

export default function AppRouter() {
  const { user } = useContext(AuthContext);
  const isGuest = !user;

  return (
    <BrowserRouter>
      <Header />
      <Routes>

        {/* Главный маршрут */}
        <Route path="/" element={<Navigate to="/events" replace />} />

        {/* Для всех */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ГОСТЬ МОЖЕТ СМОТРЕТЬ МЕРОПРИЯТИЯ, НАПРАВЛЕНИЯ И ПРОЕКТЫ */}
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId/directions" element={<DirectionsPage />} />
        <Route path="/events/:eventId/directions/:directionId/projects" element={<ProjectsPage />} />

        {/* Если пользователь НЕ авторизован, ему запрещены остальные маршруты */}
        {isGuest ? (
          <>
            <Route path="*" element={<Navigate to="/events" replace />} />
          </>
        ) : (
          <>
            {/* Направления и проекты доступны всем */}

            {/* Только авторизованные */}
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/automation" element={<ArchivePage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/requests" element={<RequestsPage />} />

            {/* Остальное */}
            <Route path="*" element={<Navigate to="/events" replace />} />
          </>
        )}

      </Routes>
    </BrowserRouter>
  );
}
