import React from 'react'
import { Route } from 'react-router-dom'
import UnitsListPage from '../../features/units/UnitsListPage'
import UnitDetailPage from '../../features/units/UnitDetailPage'

export const unitsRoutes = (
  <>
    <Route path="/units" element={<UnitsListPage />} />
    <Route path="/units/:id" element={<UnitDetailPage />} />
  </>
)
