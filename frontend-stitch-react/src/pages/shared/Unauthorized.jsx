import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { getDefaultPathForRole } from '../../utils/navigation'

function Unauthorized() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const homePath = getDefaultPathForRole(user?.role)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-soft">
          <div className="bg-gradient-to-br from-amber-50 via-white to-primary-50 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-amber-100 text-amber-700">
              <Icon name="shield-alert" size={40} />
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-amber-600">403 - Không đủ quyền</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Bạn không thể truy cập khu vực này</h1>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Tài khoản hiện tại thuộc vai trò <span className="font-bold text-slate-900">{user?.role || 'không xác định'}</span>. Hãy quay về
              dashboard phù hợp hoặc đăng nhập bằng vai trò demo khác.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
            <Link className="btn-primary justify-center" to={homePath}>
              <Icon name="layout-dashboard" size={18} />
              Về dashboard của tôi
            </Link>
            <button type="button" className="btn-secondary justify-center" onClick={handleLogout}>
              <Icon name="log-out" size={18} />
              Đăng nhập vai trò khác
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized