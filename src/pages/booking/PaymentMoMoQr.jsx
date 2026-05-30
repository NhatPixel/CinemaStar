import { formatCurrency } from './bookingData'

function PaymentMoMoQr({ qrCodeUrl, amount, compact = false }) {
  const src = String(qrCodeUrl || '').trim()
  if (!src) return null

  return (
    <div
      className={
        compact
          ? 'rounded-2xl border border-primary/30 bg-primary/10 p-4'
          : 'rounded-3xl border border-primary/30 bg-primary/10 p-5'
      }
    >
      <p className={compact ? 'text-sm text-slate-300' : 'text-sm leading-6 text-slate-300'}>
        Quét mã QR bằng app <span className="font-bold text-white">MoMo</span> để thanh toán
        {amount != null ? (
          <>
            {' '}
            <span className="font-bold text-primary">{formatCurrency(amount)}</span>
          </>
        ) : null}
        . Sau khi thanh toán thành công, trang sẽ tự cập nhật trạng thái vé.
      </p>
      <div className={`flex justify-center ${compact ? 'mt-3' : 'mt-5'}`}>
        <img
          src={src}
          alt="Mã QR thanh toán MoMo"
          className={`rounded-2xl bg-white object-contain shadow-lg ${
            compact ? 'max-h-48 max-w-[12rem] p-2' : 'max-h-72 max-w-[16rem] p-3'
          }`}
        />
      </div>
    </div>
  )
}

export default PaymentMoMoQr
