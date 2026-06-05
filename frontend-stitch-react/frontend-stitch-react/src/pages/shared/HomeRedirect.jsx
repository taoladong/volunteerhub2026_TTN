import { Navigate } from 'react-router-dom'
import Loading from '../../components/common/Loading'
import { useAuth } from '../../contexts/AuthContext'
import { getDefaultPathForRole } from '../../utils/navigation'

function HomeRedirect() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <Loading fullScreen label="Đang chuẩn bị không gian làm việc..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultPathForRole(user?.role)} replace />
}

export default HomeRedirect