function AppFooter() {
  return (
    <footer className="border-t border-primary/20 bg-background-light dark:bg-[#120a1a] py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-3xl font-bold">movie_filter</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                CinemaStar
              </h1>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Hệ thống rạp chiếu phim hiện đại hàng đầu với trải nghiệm âm thanh và hình ảnh sống
              động nhất.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-6 uppercase tracking-wider text-sm">
              Về CinemaStar
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Điều khoản sử dụng
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-6 uppercase tracking-wider text-sm">
              Hỗ trợ
            </h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Liên hệ
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Góp ý khách hàng
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-6 uppercase tracking-wider text-sm">
              Kết nối với chúng tôi
            </h4>
            <div className="flex gap-4">
              <a
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary transition-colors text-primary hover:text-white"
                href="#"
              >
                <span className="material-symbols-outlined">public</span>
              </a>
              <a
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary transition-colors text-primary hover:text-white"
                href="#"
              >
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
              <a
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary transition-colors text-primary hover:text-white"
                href="#"
              >
                <span className="material-symbols-outlined">call</span>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-primary/10 text-center text-xs text-slate-500">
          © 2024 CinemaStar. All rights reserved. Design for better cinematic experience.
        </div>
      </div>
    </footer>
  )
}

export default AppFooter

