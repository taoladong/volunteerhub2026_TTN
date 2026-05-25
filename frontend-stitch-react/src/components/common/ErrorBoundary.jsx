import React from 'react'
import Icon from './Icon'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('VolunteerHub UI error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">
              <Icon name="triangle-alert" size={34} />
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-rose-500">Có lỗi xảy ra</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900">VolunteerHub tạm thời không hiển thị được màn hình này</h1>
            <p className="mt-3 text-slate-600">
              Vui lòng tải lại trang hoặc quay về trang chủ vai trò. Thông tin phiên đăng nhập demo vẫn được giữ trong trình duyệt.
            </p>
            {this.state.error?.message && (
              <pre className="mt-5 overflow-auto rounded-2xl bg-slate-950 p-4 text-left text-xs text-slate-100">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" className="btn-primary" onClick={this.handleReload}>
                <Icon name="refresh-cw" size={18} />
                Tải lại trang
              </button>
              <button type="button" className="btn-secondary" onClick={this.handleHome}>
                <Icon name="home" size={18} />
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary