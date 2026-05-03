export const AGE_RATING_META = {
  RATING_1: { short: 'T0', text: 'Mọi lứa tuổi' },
  RATING_2: { short: 'T6', text: 'Từ 6 tuổi trở lên' },
  RATING_3: { short: 'T13', text: 'Từ 13 tuổi trở lên' },
  RATING_4: { short: 'T16', text: 'Từ 16 tuổi trở lên' },
  RATING_5: { short: 'T18', text: 'Từ 18 tuổi trở lên' },
}

export const AGE_RATING_OPTIONS = Object.entries(AGE_RATING_META).map(([value, meta]) => ({
  value,
  label: `${meta.text} (${meta.short})`,
}))