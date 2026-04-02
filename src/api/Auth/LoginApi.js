import { callApi, buildPost } from '../client'
import { authPath } from '../paths'

const LoginURL = authPath('login')

export async function login(email, password) {
    const { url, options } = buildPost(LoginURL, { email, password })
    const resp = await callApi({ url, options })
    
    if (resp?.success) {
        const token = resp?.data?.accessToken
        if (token) localStorage.setItem('accessToken', token)
        return resp.data
    }
    throw {
        status: resp?.code || 400,
        message:
            resp?.message ||
            'Tên đăng nhập hoặc mật khẩu không chính xác!',
        raw: resp,
    }
}

