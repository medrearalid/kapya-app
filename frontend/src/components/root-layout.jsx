import { Outlet } from 'react-router-dom'
import BottomNavigation from './bottom-navigation'

function RootLayout() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl sm:px-5">
      <div className="min-h-screen bg-white/70 sm:my-5 sm:rounded-3xl sm:border sm:border-sand-100 sm:shadow-sm">
        <main className="px-4 pb-24 pt-5 sm:px-8 sm:pb-28 sm:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}

export default RootLayout