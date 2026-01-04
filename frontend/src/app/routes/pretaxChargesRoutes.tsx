import React from 'react'
import { Route } from 'react-router-dom'
import PreTaxChargesListPage from '../../features/pretax-charges/PreTaxChargesListPage'
import PreTaxChargeFormPage from '../../features/pretax-charges/PreTaxChargeFormPage'

export const pretaxChargesRoutes = (
  <>
    <Route path="/pretax-charges" element={<PreTaxChargesListPage />} />
    <Route path="/pretax-charges/nuevo" element={<PreTaxChargeFormPage />} />
    <Route path="/pretax-charges/:id/editar" element={<PreTaxChargeFormPage />} />
  </>
)
