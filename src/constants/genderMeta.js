/** Khớp enum backend: MALE, FEMALE, OTHER */
export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
}

export const GENDER_LABEL_VI = {
  [Gender.MALE]: 'Nam',
  [Gender.FEMALE]: 'Nữ',
  [Gender.OTHER]: 'Khác',
}

/** Options cho form đăng ký (value gửi form → map sang API bằng registerGenderToApi) */
export const REGISTER_GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

export const registerGenderToApi = {
  male: Gender.MALE,
  female: Gender.FEMALE,
  other: Gender.OTHER,
}

/**
 * @param {string} [value] — MALE / FEMALE / OTHER hoặc bất kỳ
 * @returns {string} Nhãn hiển thị hoặc "—" nếu rỗng
 */
export function formatGenderLabel(value) {
  if (value == null || value === '') return '—'
  const key = String(value).trim().toUpperCase()
  if (GENDER_LABEL_VI[key]) return GENDER_LABEL_VI[key]
  return String(value).trim() || '—'
}
