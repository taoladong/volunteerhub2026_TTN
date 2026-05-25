import { Link } from 'react-router-dom'
import Icon from '../../components/common/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { getDefaultPathForRole } from '../../utils/navigation'

function NotFound() {
  const { isAuthenticated, user } = useAuth()
  const target = isAuthenticated ? getDefaultPathForRole(user?.role) : '/login'

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary-50 text-primary-700">
            <Icon name="map-off" size={40} />
          </div>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-primary-600">404 - Không tìm thấy</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Trang này không tồn tại trong VolunteerHub</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Đường dẫn có thể đã thay đổi hoặc chưa được kích hoạt. Sử dụng nút bên dưới để quay lại luồng demo phù hợp.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-primary justify-center" to={target}>
              <Icon name="home" size={18} />
              {isAuthenticated ? 'Về dashboard' : 'Về đăng nhập'}
            </Link>
            <Link className="btn-secondary justify-center" to="/channel">
              <Icon name="messages-square" size={18} />
              Xem kênh thảo luận
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound