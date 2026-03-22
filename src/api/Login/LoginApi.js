import { callApi, buildPost } from '../client'

const LoginURL = 'http://localhost/api/auth/login'

export async function login(email, password) {
    const { url, options } = buildPost(LoginURL, { email, password })
    const data = await callApi({ url, options })
    if (data?.success) {
        // Đăng nhập thành công, trả về accessToken hoặc toàn bộ data nếu cần
        return data.data
    }
    // Đăng nhập thất bại, ném lỗi với thông báo từ server
    throw {
        status: data?.code || 400,
        message: data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!',
        raw: data,
    }
}

