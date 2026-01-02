import React from 'react'
import { Route } from 'react-router-dom'
import TaxesListPage from '../../features/taxes/TaxesListPage'
import TaxFormPage from '../../features/taxes/TaxFormPage'

export const taxesRoutes = (
  <>
    <Route path="/taxes" element={<TaxesListPage />} />
    <Route path="/taxes/nuevo" element={<TaxFormPage />} />
    <Route path="/taxes/:id/editar" element={<TaxFormPage />} />
  </>
)
