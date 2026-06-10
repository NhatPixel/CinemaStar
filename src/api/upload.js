import { buildCookieHeaders } from '../utils/authCookieStorage'
import { uploadPath } from './config/paths'
import { BASE_URL, parseResponse } from './config/transport'

const UPLOAD_IMAGES_URL = uploadPath('images')
const videoSessionsUrl = () => uploadPath('videos/sessions')
const videoSessionUrl = (sessionId) => uploadPath(`videos/sessions/${sessionId}`)
const videoChunkUrl = (sessionId, index) =>
  uploadPath(`videos/sessions/${sessionId}/chunks/${index}`)
const videoCompleteUrl = (sessionId) => uploadPath(`videos/sessions/${sessionId}/complete`)

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
])

async function uploadRequest(url, { method = 'GET', body, headers = {} } = {}) {
  const finalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const response = await fetch(finalUrl, {
    method,
    credentials: 'include',
    body,
    headers: {
      ...buildCookieHeaders(),
      ...headers,
    },
  })
  const payload = await parseResponse(response)
  if (!payload?.success) {
    throw {
      status: response.status,
      message: payload?.message || 'Upload thất bại',
      code: payload?.code,
      raw: payload,
    }
  }
  return payload.data
}

function splitFileIntoChunks(file, chunkSize) {
  const chunks = []
  let start = 0
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size)
    chunks.push(file.slice(start, end))
    start = end
  }
  return chunks
}

/** POST /uploads/images — tối đa 5 file. */
export async function uploadImages(files) {
  const list = Array.from(files || []).filter(Boolean)
  if (list.length === 0) {
    throw { message: 'Chưa chọn file ảnh' }
  }
  if (list.length > 5) {
    throw { message: 'Chỉ được tải tối đa 5 ảnh mỗi lần' }
  }
  const formData = new FormData()
  for (const file of list) {
    formData.append('files', file)
  }
  const data = await uploadRequest(UPLOAD_IMAGES_URL, { method: 'POST', body: formData })
  return data?.files || []
}

/**
 * Upload một ảnh — POST /uploads/images.
 * @returns {Promise<string>} public URL (`data.files[0].url`)
 */
export async function uploadImageFile(file) {
  if (!file) {
    throw { message: 'Chưa chọn file ảnh' }
  }
  const contentType = file.type || 'image/jpeg'
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw { message: 'Định dạng ảnh không hỗ trợ (jpeg, png, webp, gif)' }
  }
  const files = await uploadImages([file])
  const url = files[0]?.url
  if (!url) {
    throw { message: 'Upload xong nhưng không nhận được URL ảnh từ server' }
  }
  return url
}

export async function createVideoUploadSession(file) {
  return uploadRequest(videoSessionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalFileName: file.name,
      contentType: file.type || 'video/mp4',
      size: file.size,
    }),
  })
}

export async function uploadVideoChunk(sessionId, index, chunk) {
  return uploadRequest(videoChunkUrl(sessionId, index), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: chunk,
  })
}

export async function getVideoUploadSessionStatus(sessionId) {
  return uploadRequest(videoSessionUrl(sessionId), { method: 'GET' })
}

export async function completeVideoUpload(sessionId) {
  return uploadRequest(videoCompleteUrl(sessionId), { method: 'POST' })
}

/**
 * Upload video theo flow chunked của upload-service.
 * @returns {Promise<string>} public URL (`data.file.url`)
 */
export async function uploadVideoFile(file, { onProgress } = {}) {
  if (!file) {
    throw { message: 'Chưa chọn file video' }
  }
  const contentType = file.type || 'video/mp4'
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    throw { message: 'Định dạng video không hỗ trợ (mp4, mov, avi, mkv)' }
  }

  const session = await createVideoUploadSession(file)
  const sessionId = session?.sessionId
  const chunkSize = Number(session?.chunkSize)
  if (!sessionId || !Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw { message: 'Không tạo được phiên upload video' }
  }

  const chunks = splitFileIntoChunks(file, chunkSize)
  for (let index = 0; index < chunks.length; index += 1) {
    const chunkResult = await uploadVideoChunk(sessionId, index, chunks[index])
    const percent = Number(chunkResult?.progressPercent)
    if (Number.isFinite(percent)) {
      onProgress?.(percent)
    } else {
      onProgress?.(((index + 1) / chunks.length) * 100)
    }
  }

  const complete = await completeVideoUpload(sessionId)
  const url = complete?.file?.url
  if (!url) {
    throw { message: 'Upload xong nhưng không nhận được URL video từ server' }
  }
  onProgress?.(100)
  return url
}
