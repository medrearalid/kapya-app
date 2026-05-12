import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import './utils/i18n'
import RootLayout from './components/root-layout'
import GlobalErrorDisplay from './components/GlobalErrorDisplay'
import DashboardPage from './pages/dashboard-page'
import PantryPage from './pages/pantry-page'
import PlannerPage from './pages/planner-page'
import RecipeDetailPage from './pages/recipe-detail-page'
import RecipePage from './pages/recipe-page'
import SettingsPage from './pages/settings-page'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <GlobalErrorDisplay />,
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
        path: 'recipes/:recipeId',
        element: <RecipeDetailPage />,
      },
      {
        path: 'planner',
        element: <PlannerPage />,
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
