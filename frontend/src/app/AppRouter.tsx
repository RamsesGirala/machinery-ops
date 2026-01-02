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

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {homeRoutes}
        {machinesRoutes}
        {accessoriesRoutes}
        {logisticsLegsRoutes}
        {taxesRoutes}
        {budgetsRoutes}
        {unitsRoutes}
        {reportsRoutes}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
