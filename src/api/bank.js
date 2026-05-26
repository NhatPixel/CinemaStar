import { callApi, buildGet } from './config/client'
import { paymentPath } from './config/paths'

const BANKS_URL = paymentPath('banks')

export async function getBanks() {
  const { url, options } = buildGet(BANKS_URL)
  const resp = await callApi({ url, options })

  if (resp?.success && Array.isArray(resp.data)) {
    return resp.data
  }

  if (Array.isArray(resp?.data)) {
    return resp.data
  }

  if (Array.isArray(resp)) {
    return resp
  }

  throw {
    status: 500,
    message: 'Không thể tải danh sách ngân hàng',
    raw: resp,
  }
}
