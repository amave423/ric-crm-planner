import { useNavigate } from 'react-router-dom';
import Logo from '../assets/LogoIcon.svg';

interface TopHeaderProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
}

export default function TopHeader({ menuOpen, onToggleMenu }: TopHeaderProps) {
  const navigate = useNavigate();

  // Получаем текущего пользователя из localStorage (если есть)
  const raw = localStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const username = user?.username || user?.user?.username || null;

  return (
    <div className="TopHeaderContainer">
      <div className="TopHeader logged">
        <div className="HeaderLeft">
          {/* гамбургер слева */}
          <button
            className={`Hamburger ${menuOpen ? 'open' : ''}`}
            aria-label="open-menu"
            onClick={onToggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="HeaderCenter">
          {/* логотип по центру */}
          <img className="TopLogo" src={Logo} alt="Logo" />
        </div>

        <div className="HeaderRight">
          {username ? (
            <button
              className="UserPill"
              onClick={() => navigate('/profile')}
              title="Профиль"
            >
              <span className="UserAvatar">{username[0]?.toUpperCase() || 'U'}</span>
              <span>{username}</span>
            </button>
          ) : (
            <button
              className="HeaderBtn small LoginButton"
              onClick={() => {
                console.log('Кнопка "Войти" нажата');
                navigate('/login');
              }}
            >
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
