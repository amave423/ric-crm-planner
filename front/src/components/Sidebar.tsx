import { Link } from 'react-router-dom';
import React from 'react';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className={`AppSidebar ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="SidebarInner">
          <button className="SidebarClose" onClick={onClose} aria-label="close-menu">✕</button>
          <nav>
            <ul>
              <li><Link to="/events" onClick={onClose}>Мероприятия</Link></li>
              <li><Link to="/projects" onClick={onClose}>Проекты</Link></li>
              <li><Link to="/requests" onClick={onClose}>Заявки</Link></li>
              <li><Link to="/directions" onClick={onClose}>Направления</Link></li>
              <li><Link to="/profile" onClick={onClose}>Мой профиль</Link></li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* backdrop как соседний элемент — CSS .AppSidebar.open + .SidebarBackdrop будет работать */}
      <div
        className={`SidebarBackdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      />
    </>
  );
}
