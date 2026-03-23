import { callApi, buildPost } from '../client'
import { authPath } from '../paths'

const LoginURL = authPath('login')

export async function login(email, password) {
    const { url, options } = buildPost(LoginURL, { email, password })
    const data = await callApi({ url, options })
    
    if (data?.success) {
        return data.data
    }
    throw {
        status: data?.code || 400,
        message: data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!',
        raw: data,
    }
}

