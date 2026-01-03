import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../theme/ThemeContext'

const MainLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'app-nav-link',
      'text-decoration-none',
      'd-inline-block',
      isActive ? 'app-nav-link-active' : ''
    ].join(' ')

  return (
    <div className="app-shell d-flex">
      {/* Sidebar */}
      <aside className="app-sidebar p-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="app-brand">Machinery Ops</div>
            <div className="text-muted small">Catálogo</div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-sm btn-soft-primary rounded-pill"
            title="Cambiar tema"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="d-flex flex-column gap-1">
          <NavLink to="/" end className={linkClass}>
            Inicio
          </NavLink>

          <div className="mt-2 mb-1 text-muted small">Recursos</div>

          <NavLink to="/machines" className={linkClass}>
            Machines
          </NavLink>

          <NavLink to="/accessories" className={linkClass}>
            Accessories
          </NavLink>

          <NavLink to="/logistics-legs" className={linkClass}>
            Logistics Legs
          </NavLink>

          <NavLink to="/taxes" className={linkClass}>
            Taxes
          </NavLink>

          <NavLink to="/budgets" className={linkClass}>
            Bugdets
          </NavLink>

          <NavLink to="/units" className={linkClass}>
            Units
          </NavLink>

          <NavLink to="/reports/finance" className={linkClass}>
            Finances
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-grow-1 p-4 app-main-wrapper">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 app-main-card p-4">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MainLayout
