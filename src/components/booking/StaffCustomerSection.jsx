import { useState } from 'react'
import { getCustomerByPhone, getUserById } from '../../api/user'
import Button from '../Button'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import { useToast } from '../useToast'

const EMPTY_CUSTOMER = {
  fullName: '',
  email: '',
  phone: '',
}

function StaffCustomerSection({
  customerInfo,
  customerId,
  onCustomerInfoChange,
  onCustomerIdChange,
  disabled = false,
}) {
  const toast = useToast()
  const [lookupPhone, setLookupPhone] = useState(() => customerInfo?.phone || '')
  const [lookingUp, setLookingUp] = useState(false)

  const handleLookup = async () => {
    const phone = lookupPhone.trim()
    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại để tra cứu')
      return
    }

    setLookingUp(true)
    try {
      const basic = await getCustomerByPhone(phone)
      let email = ''
      try {
        const profile = await getUserById(basic.id)
        email = String(profile?.email || '').trim()
      } catch {
        email = ''
      }
      onCustomerIdChange?.(basic.id)
      onCustomerInfoChange?.({
        fullName: String(basic.name || '').trim(),
        email,
        phone: String(basic.phone || phone).trim(),
      })
      toast.success('Đã tìm thấy khách hàng')
    } catch (e) {
      onCustomerIdChange?.(null)
      onCustomerInfoChange?.({
        ...EMPTY_CUSTOMER,
        phone,
      })
      toast.info(e?.message || 'Chưa có tài khoản — vui lòng nhập thông tin khách mới')
    } finally {
      setLookingUp(false)
    }
  }

  const updateField = (field, value) => {
    onCustomerIdChange?.(null)
    onCustomerInfoChange?.({
      ...customerInfo,
      [field]: value,
    })
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-[#120a1a] p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Text variant="h2" className="text-2xl font-black text-white">
            Thông tin khách hàng
          </Text>
          <p className="mt-2 text-sm text-slate-400">
            Tra cứu theo số điện thoại hoặc nhập thông tin khách mới để đặt vé.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
          <Icon name="point_of_sale" className="text-lg" />
          Bán vé tại quầy
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label
          htmlFor="staffLookupPhone"
          className="ml-1 block text-sm font-medium text-slate-300"
        >
          Tra cứu khách theo SĐT
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="staffLookupPhone"
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            placeholder="0901234567"
            icon="phone"
            disabled={disabled || lookingUp}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-[50px] shrink-0 rounded-lg px-5"
            disabled={disabled || lookingUp || !lookupPhone.trim()}
            onClick={handleLookup}
          >
            <Icon name="search" />
            {lookingUp ? 'Đang tra...' : 'Tra cứu'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Họ và tên"
          value={customerInfo.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          placeholder="Nguyen Van A"
          icon="person"
          disabled={disabled}
        />
        <Input
          label="Email"
          type="email"
          value={customerInfo.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="email@example.com"
          icon="mail"
          disabled={disabled}
        />
        <Input
          label="Số điện thoại"
          value={customerInfo.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="0900000000"
          icon="phone"
          disabled={disabled}
        />
      </div>
    </section>
  )
}

export default StaffCustomerSection
