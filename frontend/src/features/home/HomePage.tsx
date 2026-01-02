import React from 'react'
import { Link } from 'react-router-dom'

const HomePage: React.FC = () => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Inicio</h2>
          <div className="text-muted">Pantalla en construcción.</div>
        </div>
        <span className="badge badge-soft rounded-pill">v0</span>
      </div>

      <div className="alert alert-info rounded-4">
        Por ahora, usá el menú de la izquierda para administrar el catálogo.
      </div>

      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-soft-primary rounded-pill" to="/machines">Ir a Machines</Link>
        <Link className="btn btn-soft-primary rounded-pill" to="/accessories">Ir a Accessories</Link>
        <Link className="btn btn-soft-primary rounded-pill" to="/logistics-legs">Ir a Logistics Legs</Link>
        <Link className="btn btn-soft-primary rounded-pill" to="/taxes">Ir a Taxes</Link>
      </div>
    </div>
  )
}

export default HomePage
