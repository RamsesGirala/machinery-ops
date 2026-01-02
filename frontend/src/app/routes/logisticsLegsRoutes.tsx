import React from 'react'
import { Route } from 'react-router-dom'
import LogisticsLegsListPage from '../../features/logistics-legs/LogisticsLegsListPage'
import LogisticsLegFormPage from '../../features/logistics-legs/LogisticsLegFormPage'

export const logisticsLegsRoutes = (
  <>
    <Route path="/logistics-legs" element={<LogisticsLegsListPage />} />
    <Route path="/logistics-legs/nuevo" element={<LogisticsLegFormPage />} />
    <Route path="/logistics-legs/:id/editar" element={<LogisticsLegFormPage />} />
  </>
)
