import { Icon, Text, Button } from '.'

function AppHeader({ showLoginButton = true }) {
  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-12">
            <a className="flex items-center gap-3 text-primary" href="#">
              <Icon name="movie_filter" className="text-4xl font-bold" />
              <Text
                variant="h2"
                className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                CinemaStar
              </Text>
            </a>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-semibold hover:text-primary transition-colors" href="#">
                Phim
              </a>
              <a className="text-sm font-semibold hover:text-primary transition-colors" href="#">
                Rạp
              </a>
              <a className="text-sm font-semibold hover:text-primary transition-colors" href="#">
                Ưu đãi
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            {showLoginButton ? (
              <Button
                variant="primary"
                size="sm"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-full"
              >
                <Icon name="login" className="text-lg" />
                <span className="text-sm font-semibold">Đăng nhập</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center justify-center p-2 rounded-full hover:bg-primary/20 transition-colors"
              >
                <Icon name="account_circle" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader

