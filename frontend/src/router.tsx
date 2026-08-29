import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import AccountPage from './pages/AccountPage';
import DatenschutzPage from './pages/DatenschutzPage';
import ImpressumPage from './pages/ImpressumPage';
import LoginPage from './pages/LoginPage';
import OutfitCreatorPage from './pages/OutfitCreatorPage';
import OutfitsPage from './pages/OutfitsPage';
import RegisterPage from './pages/RegisterPage';
import WardrobePage from './pages/WardrobePage';

function RequireAuth() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/wardrobe', element: <WardrobePage /> },
          { path: '/outfits', element: <OutfitsPage /> },
          { path: '/outfits/new', element: <OutfitCreatorPage /> },
          { path: '/account', element: <AccountPage /> },
        ],
      },
    ],
  },
  {
    element: <Layout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/impressum', element: <ImpressumPage /> },
      { path: '/datenschutz', element: <DatenschutzPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/wardrobe" replace /> },
  { path: '*', element: <Navigate to="/wardrobe" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
