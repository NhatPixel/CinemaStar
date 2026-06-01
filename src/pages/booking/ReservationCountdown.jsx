import { useEffect, useState } from 'react'
import { Icon } from '../../components'
import { formatCountdownFromMs } from './bookingData'

function ReservationCountdown({ deadlineMs }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, Number(deadlineMs || 0) - Date.now()),
  )

  useEffect(() => {
    if (!deadlineMs) return undefined
    const tick = () => setRemainingMs(Math.max(0, deadlineMs - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineMs])

  const expired = remainingMs <= 0
  const label = formatCountdownFromMs(remainingMs)

  return (
    <div
      className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center"
      role="timer"
      aria-live="polite"
      aria-label={expired ? 'Đã hết thời gian giữ ghế' : `Còn ${label} để thanh toán`}
    >
      <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
        <Icon name="timer" className="text-base" />
        Thời gian còn lại
      </p>
      <p
        className={`mt-2 font-mono text-4xl font-black tabular-nums tracking-wider ${
          expired ? 'text-red-400' : 'text-white'
        }`}
      >
        {label}
      </p>
      <p className={`mt-2 text-xs ${expired ? 'text-red-300/90' : 'text-slate-400'}`}>
        {expired
          ? 'Đã hết thời gian giữ ghế. Vui lòng đặt vé lại.'
          : 'Hoàn tất thanh toán trước khi hết thời gian giữ ghế.'}
      </p>
    </div>
  )
}

export default ReservationCountdown
