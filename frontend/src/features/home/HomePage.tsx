import React from 'react'
import { Link } from 'react-router-dom'

type Action = { label: string; to: string; variant?: 'primary' | 'soft' }
type QuickItem = { icon: string; title: string; description: string; actions: Action[] }
type Section = { title: string; subtitle?: string; items: QuickItem[] }

const QuickCard: React.FC<{ item: QuickItem }> = ({ item }) => {
  return (
    <div className="card border rounded-4 h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start gap-3 mb-2">
          <div
            className="rounded-4 d-flex align-items-center justify-content-center"
            style={{
              width: 44,
              height: 44,
              background: 'var(--color-primary-soft)',
              border: '1px solid var(--color-border)',
              flex: '0 0 auto'
            }}
            aria-hidden="true"
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
          </div>

          <div className="flex-grow-1">
            <div className="fw-bold">{item.title}</div>
            <div className="text-muted small">{item.description}</div>
          </div>
        </div>

        <div className="mt-auto d-flex flex-wrap gap-2 pt-2">
          {item.actions.map((a) => {
            const cls =
              a.variant === 'primary'
                ? 'btn btn-primary rounded-pill'
                : 'btn btn-soft-primary rounded-pill'
            return (
              <Link key={`${item.title}-${a.to}-${a.label}`} className={cls} to={a.to}>
                {a.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const HomePage: React.FC = () => {
  const sections: Section[] = [
    {
      title: 'Operaciones',
      subtitle: 'Accesos rápidos para trabajar en el día a día.',
      items: [
        {
          icon: '🧾',
          title: 'Presupuestos',
          description: 'Crear, editar y administrar presupuestos.',
          actions: [
            { label: 'Ver', to: '/budgets', variant: 'soft' },
            { label: 'Nuevo', to: '/budgets/nuevo', variant: 'primary' }
          ]
        },
        {
          icon: '🏗️',
          title: 'Unidades',
          description: 'Ver unidades, detalle y acciones (venta / alquiler).',
          actions: [{ label: 'Ver', to: '/units', variant: 'primary' }]
        },
        {
          icon: '💳',
          title: 'Pagos',
          description: 'Registrar y consultar pagos asociados a operaciones.',
          actions: [{ label: 'Ver', to: '/payments', variant: 'primary' }]
        }
      ]
    },
    {
      title: 'Catálogo',
      subtitle: 'Entidades base del negocio.',
      items: [
        {
          icon: '👤',
          title: 'Clientes',
          description: 'Alta y mantenimiento de clientes.',
          actions: [
            { label: 'Ver', to: '/clients', variant: 'soft' },
            { label: 'Nuevo', to: '/clients/nuevo', variant: 'primary' }
          ]
        },
        {
          icon: '🚜',
          title: 'Maquinaria',
          description: 'Tipos de máquinas para presupuestar y comprar.',
          actions: [
            { label: 'Ver', to: '/machines', variant: 'soft' },
            { label: 'Nueva', to: '/machines/nuevo', variant: 'primary' }
          ]
        },
        {
          icon: '🧩',
          title: 'Accesorios',
          description: 'Accesorios y consumibles asociados a maquinaria.',
          actions: [
            { label: 'Ver', to: '/accessories', variant: 'soft' },
            { label: 'Nuevo', to: '/accessories/nuevo', variant: 'primary' }
          ]
        },
         {
          icon: '🧾',
          title: 'Impuestos',
          description: 'Impuestos aplicables a presupuestos.',
          actions: [
            { label: 'Ver', to: '/taxes', variant: 'soft' },
            { label: 'Nuevo', to: '/taxes/nuevo', variant: 'primary' }
          ]
        },
        {
          icon: '➕',
          title: 'Cargas Pre Impuestos',
          description: 'Cargos que se suman antes de impuestos.',
          actions: [
            { label: 'Ver', to: '/pretax-charges', variant: 'soft' },
            { label: 'Nuevo', to: '/pretax-charges/nuevo', variant: 'primary' }
          ]
        },
        {
          icon: '🚚',
          title: 'Tramos logísticos',
          description: 'Tramos, etapas y costos de logística.',
          actions: [
            { label: 'Ver', to: '/logistics-legs', variant: 'soft' },
            { label: 'Nuevo', to: '/logistics-legs/nuevo', variant: 'primary' }
          ]
        }
      ]
    },
    {
      title: 'Reportes',
      subtitle: 'Consulta rápida para seguimiento.',
      items: [
        {
          icon: '📈',
          title: 'Finanzas',
          description: 'Reporte financiero y métricas de ingresos.',
          actions: [{ label: 'Ver', to: '/reports/finance', variant: 'primary' }]
        }
      ]
    }
  ]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Inicio</h2>
          <div className="text-muted">Accesos rápidos a las secciones principales.</div>
        </div>
        <span className="badge badge-soft rounded-pill">v0</span>
      </div>

      {sections.map((s) => (
        <div key={s.title} className="mb-4">
          <div className="d-flex align-items-end justify-content-between mb-2">
            <div>
              <h5 className="mb-0">{s.title}</h5>
              {s.subtitle ? <div className="text-muted small">{s.subtitle}</div> : null}
            </div>
          </div>

          <div className="row g-3">
            {s.items.map((item) => (
              <div key={`${s.title}-${item.title}`} className="col-12 col-md-6 col-xl-4">
                <QuickCard item={item} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default HomePage
