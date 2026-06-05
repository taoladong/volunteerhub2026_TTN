import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-6 py-12">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-warmink mb-2">Đã xảy ra lỗi</h2>
          <p className="text-sm text-warmink-2 mb-4 text-center max-w-md">
            Một thành phần giao diện gặp sự cố. Bạn có thể thử tải lại trang hoặc quay lại trang trước.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="btn-secondary flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-right" /> Thử lại
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex items-center gap-2"
            >
              <i className="fa-solid fa-arrows-rotate" /> Tải lại trang
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 p-4 bg-surface-2 border border-warmborder rounded-lg text-xs text-red-700 max-w-2xl overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}