import React from 'react'
import { Route } from 'react-router-dom'
import MachinesListPage from '../../features/machines/MachinesListPage'
import MachineFormPage from '../../features/machines/MachineFormPage'

export const machinesRoutes = (
  <>
    <Route path="/machines" element={<MachinesListPage />} />
    <Route path="/machines/nuevo" element={<MachineFormPage />} />
    <Route path="/machines/:id/editar" element={<MachineFormPage />} />
  </>
)
