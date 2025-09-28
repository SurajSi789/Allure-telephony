import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  console.log('ProtectedRoute rendering...')
  const token = localStorage.getItem("token");
  console.log('Token:', token ? 'exists' : 'missing')

  if (!token) {
    console.log('No token, redirecting to login')
    return <Navigate to="/" replace />;
  }

  console.log('Token found, rendering children')
  return children;
};

export default ProtectedRoute;