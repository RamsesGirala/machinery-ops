import React from 'react'
import { Route } from 'react-router-dom'
import BudgetsListPage from '../../features/budgets/BudgetsListPage'
import BudgetCreatePage from '../../features/budgets/BudgetCreatePage'
import BudgetDetailPage from '../../features/budgets/BudgetDetailPage'

export const budgetsRoutes = (
  <>
    <Route path="/budgets" element={<BudgetsListPage />} />
    <Route path="/budgets/nuevo" element={<BudgetCreatePage />} />
    <Route path="/budgets/:id/editar" element={<BudgetCreatePage />} />
    <Route path="/budgets/:id" element={<BudgetDetailPage />} />
  </>
)
