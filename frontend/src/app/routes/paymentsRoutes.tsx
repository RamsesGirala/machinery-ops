import React from 'react'
import { Route } from 'react-router-dom'
import PaymentsPage from '../../features/payments/PaymentsPage'

export const paymentsRoutes = (
  <>
    <Route path="/payments" element={<PaymentsPage />} />
  </>
)
