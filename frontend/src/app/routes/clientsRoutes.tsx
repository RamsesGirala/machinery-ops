import React from 'react'
import { Route } from 'react-router-dom'
import ClientsListPage from '../../features/clients/ClientsListPage'
import ClientFormPage from '../../features/clients/ClientFormPage'

export const clientsRoutes = (
  <>
    <Route path="/clients" element={<ClientsListPage />} />
    <Route path="/clients/nuevo" element={<ClientFormPage />} />
    <Route path="/clients/:id/editar" element={<ClientFormPage />} />
  </>
)
