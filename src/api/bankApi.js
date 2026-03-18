import { callApi, buildGet } from './client'

const VIETQR_BANKS_URL = 'https://api.vietqr.io/v2/banks'

export async function getBanks() {
  const { url, options } = buildGet(VIETQR_BANKS_URL)
  const data = await callApi({ url, options })

  if (data?.code === '00' && Array.isArray(data.data)) {
    return data.data
  }

  throw {
    status: 500,
    message: 'Không thể tải danh sách ngân hàng',
    raw: data,
  }
}

