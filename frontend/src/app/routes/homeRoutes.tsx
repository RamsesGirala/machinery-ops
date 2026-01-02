import React from 'react'
import { Route } from 'react-router-dom'
import HomePage from '../../features/home/HomePage'

export const homeRoutes = (
  <>
    <Route path="/" element={<HomePage />} />
  </>
)
