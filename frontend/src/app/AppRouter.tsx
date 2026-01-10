import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import MainLayout from './layout/MainLayout'

import { homeRoutes } from './routes/homeRoutes'
import { machinesRoutes } from './routes/machinesRoutes'
import { accessoriesRoutes } from './routes/accessoriesRoutes'
import { logisticsLegsRoutes } from './routes/logisticsLegsRoutes'
import { taxesRoutes } from './routes/taxesRoutes'
import { budgetsRoutes } from './routes/budgetsRoutes'
import { unitsRoutes } from './routes/unitsRoutes'
import { reportsRoutes } from './routes/reportsRoutes'
import { clientsRoutes } from './routes/clientsRoutes'
import { pretaxChargesRoutes } from './routes/pretaxChargesRoutes'
import { additionalChargesRoutes } from './routes/additionalChargesRoutes'
import { paymentsRoutes } from './routes/paymentsRoutes'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {homeRoutes}
        {machinesRoutes}
        {accessoriesRoutes}
        {logisticsLegsRoutes}
        {taxesRoutes}
        {clientsRoutes}
        {pretaxChargesRoutes}
        {budgetsRoutes}
        {unitsRoutes}
        {paymentsRoutes}
        {additionalChargesRoutes}
        {reportsRoutes}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
