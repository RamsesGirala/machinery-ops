/**
 * Helpers de estilos para badges (Bootstrap).
 * La idea es mantener colores consistentes y representativos en toda la app.
 */

export function unitEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'DEPOSITO':
      // Disponible / en stock
      return 'bg-secondary'
    case 'ALQUILADA':
      // En curso
      return 'bg-primary'
    case 'VENDIDA':
      // Cerrado / finalizado
      return 'bg-dark'
    default:
      return 'bg-secondary'
  }
}

export function budgetEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'DRAFT':
      return 'bg-secondary'
    case 'CERRADO':
      // Cerrado no debería verse "éxito/verde"
      return 'bg-dark'
    // futuros estados posibles:
    case 'ENVIADO':
      return 'bg-primary'
    case 'APROBADO':
      return 'bg-info'
    case 'CANCELADO':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

export function logisticsTipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case 'AEREO':
      return 'bg-secondary'
    case 'MARITIMO':
      return 'bg-primary'
    case 'TERRESTRE':
      return 'bg-success'
    default:
      return 'bg-secondary'
  }
}

export function logisticsEtapaBadgeClass(etapa: string): string {
  switch (etapa) {
    case 'HASTA_ADUANA':
      // Warning suele necesitar texto oscuro para legibilidad
      return 'bg-warning text-dark'
    case 'POST_ADUANA':
      return 'bg-info'
    default:
      return 'bg-secondary'
  }
}
