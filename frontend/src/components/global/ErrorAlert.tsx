import React from 'react'

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  )
}

export default ErrorAlert
