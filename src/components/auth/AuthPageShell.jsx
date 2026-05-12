/**
 * Nền chung cho các trang đăng nhập / đăng ký (gradient + ảnh + glow).
 */
function AuthPageShell({ children }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col text-slate-100"
      style={{ backgroundColor: '#191022' }}
    >
      <div
        className="fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at top right, #3b0764, transparent), radial-gradient(circle at bottom left, #1e1b4b, transparent)',
        }}
      />
      <div
        className="fixed inset-0 z-0 opacity-60"
        aria-hidden
        style={{
          backgroundImage: "url('/assets/auth-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="fixed top-0 right-0 w-96 h-96 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none z-[1]"
        style={{ backgroundColor: 'rgba(115, 17, 212, 0.2)' }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none z-[1]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full">{children}</div>
    </div>
  )
}

export default AuthPageShell
