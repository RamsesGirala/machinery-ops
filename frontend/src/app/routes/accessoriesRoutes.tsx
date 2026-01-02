import React from 'react'
import { Route } from 'react-router-dom'
import AccessoriesListPage from '../../features/accessories/AccessoriesListPage'
import AccessoryFormPage from '../../features/accessories/AccessoryFormPage'

export const accessoriesRoutes = (
  <>
    <Route path="/accessories" element={<AccessoriesListPage />} />
    <Route path="/accessories/nuevo" element={<AccessoryFormPage />} />
    <Route path="/accessories/:id/editar" element={<AccessoryFormPage />} />
  </>
)
