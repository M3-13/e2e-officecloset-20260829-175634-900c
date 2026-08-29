import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/wardrobe', label: 'Garderobe' },
  { to: '/outfits', label: 'Outfits' },
  { to: '/impressum', label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutz' },
];

export default function Navbar() {
  const { token, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          Office Closet
        </Link>
        <nav className="navbar__links" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {token && (
            <button type="button" className="navbar__logout" onClick={logout}>
              Abmelden
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
