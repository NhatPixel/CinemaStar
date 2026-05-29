import { Link, useLocation } from 'react-router-dom'
import { AppFooter, AppHeader, Icon, Text } from '../../components'
import { PAGE_MAIN, PAGE_SHELL } from '../../constants/pageLayout'
import { BOOKING_STEPS } from './bookingData'

function BookingLayout({ eyebrow, title, subtitle, children, aside }) {
  const location = useLocation()
  const currentStepIndex = BOOKING_STEPS.findIndex((step) => location.pathname.startsWith(step.path))

  return (
    <div className={PAGE_SHELL}>
      <AppHeader />

      <main className={`${PAGE_MAIN} space-y-8`}>
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[#120a1a] p-6 shadow-2xl shadow-primary/10 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(115,17,212,0.36),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,7,100,0.34),transparent_36%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div className="space-y-5">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <Link className="hover:text-primary" to="/">
                  Trang chủ
                </Link>
                <Icon name="chevron_right" className="text-base" />
                <span className="text-primary">Đơn đặt vé</span>
              </nav>

              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-primary">
                  {eyebrow}
                </span>
                <Text variant="h1" className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                  {title}
                </Text>
                <Text variant="body" className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  {subtitle}
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {BOOKING_STEPS.map((step, index) => {
                const isActive = index === currentStepIndex
                const isDone = currentStepIndex > index

                return (
                  <div
                    key={step.path}
                    className={`rounded-2xl border p-4 transition ${
                      isActive
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25'
                        : isDone
                          ? 'border-primary/30 bg-primary/10 text-slate-100'
                          : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Icon name={isDone ? 'check_circle' : step.icon} className="text-2xl" />
                      <span className="text-xs font-bold">0{index + 1}</span>
                    </div>
                    <p className="text-sm font-bold">{step.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <div className={aside ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]' : ''}>
          <div className="min-w-0">{children}</div>
          {aside ? <aside className="lg:sticky lg:top-28 lg:self-start">{aside}</aside> : null}
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

export default BookingLayout
