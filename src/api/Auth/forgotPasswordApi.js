import { callApiWithResponse, buildPost } from '../client'
import { authPath } from '../paths'
import { persistCookieHeaderFromResponse } from '../../utils/authCookieStorage'

const FORGOT_URL = authPath('forgot-password')

export async function forgotPassword({ email }) {
  const { url, options } = buildPost(FORGOT_URL, { email })
  const { payload: resp, response } = await callApiWithResponse({
    url,
    options,
  })

  if (resp?.success) {
    persistCookieHeaderFromResponse(response)
    return resp.data
  }

  throw {
    status: resp?.code || 400,
    message: resp?.message || 'Yêu cầu thất bại',
    raw: resp,
  }
}

