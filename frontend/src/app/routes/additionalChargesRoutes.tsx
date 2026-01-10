import React from 'react'
import { Route } from 'react-router-dom'
import AdditionalChargesListPage from '../../features/additional-charges/AdditionalChargesListPage'
import AdditionalChargeFormPage from '../../features/additional-charges/AdditionalChargeFormPage'

export const additionalChargesRoutes = (
  <>
    <Route path="/additional-charges" element={<AdditionalChargesListPage />} />
    <Route path="/additional-charges/nuevo" element={<AdditionalChargeFormPage />} />
    <Route path="/additional-charges/:id/editar" element={<AdditionalChargeFormPage />} />
  </>
)
