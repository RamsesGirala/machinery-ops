import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const MainLayout: React.FC = () => {

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
            <div className="text-muted small">Inicio</div>
          </div>

        </div>

        <div className="d-flex flex-column gap-1">
          <NavLink to="/" end className={linkClass}>
            Inicio
          </NavLink>

          <div className="mt-2 mb-1 text-muted small">Catálogo</div>

          <NavLink to="/clients" className={linkClass}>
            Clientes
          </NavLink>

          <NavLink to="/pretax-charges" className={linkClass}>
            Cargas Pre Impuestos
          </NavLink>

          <NavLink to="/taxes" className={linkClass}>
            Impuestos
          </NavLink>

          <NavLink to="/additional-charges" className={linkClass}>
            Cargos adicionales
          </NavLink>

          <NavLink to="/logistics-legs" className={linkClass}>
            Logística
          </NavLink>

          <NavLink to="/accessories" className={linkClass}>
            Accesorios
          </NavLink>

          <NavLink to="/machines" className={linkClass}>
            Items
          </NavLink>

          <div className="mt-3 mb-1 text-muted small">Operaciones</div>

          <NavLink to="/budgets" className={linkClass}>
            Presupuestos
          </NavLink>

          <NavLink to="/units" className={linkClass}>
            Unidades
          </NavLink>

          <NavLink to="/payments" className={linkClass}>
            Pagos
          </NavLink>

          <div className="mt-3 mb-1 text-muted small">Reportes</div>

          <NavLink to="/reports/finance" className={linkClass}>
            Finanzas
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
