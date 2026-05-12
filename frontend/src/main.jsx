import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import './utils/i18n'
import RootLayout from './components/root-layout'
import DashboardPage from './pages/dashboard-page'
import PantryPage from './pages/pantry-page'
import RecipePage from './pages/recipe-page'
import SettingsPage from './pages/settings-page'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'pantry',
        element: <PantryPage />,
      },
      {
        path: 'recipes',
        element: <RecipePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
