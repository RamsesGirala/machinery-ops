import React from 'react'
import { Route } from 'react-router-dom'
import FinanceReportPage from '../../features/reports/FinanceReportPage'

export const reportsRoutes = (
  <>
    <Route path="/reports/finance" element={<FinanceReportPage />} />
  </>
)
