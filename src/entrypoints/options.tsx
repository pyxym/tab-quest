import React from "react"
import Dashboard from "../tabs/dashboard"
import "../assets/styles/options.css"

function OptionsPage() {
  return <Dashboard />
}

export default OptionsPage

// Mount the app
import { createRoot } from 'react-dom/client'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<OptionsPage />)
}