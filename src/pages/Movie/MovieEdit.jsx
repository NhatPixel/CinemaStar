import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MovieUpsertForm, useToast } from '../../components'
import { getFilmById, updateFilm } from '../../api/film'

function MovieEdit() {
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [film, setFilm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    const ac = new AbortController()

    ;(async () => {
      try {
        setLoading(true)
        const data = await getFilmById(id, { signal: ac.signal })
        if (!cancelled) setFilm(data)
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        toast.error(err?.message || 'Không tải được thông tin phim')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [id, toast])

  const handleSubmit = async (payload) => {
    if (!id) {
      toast.error('Không xác định được phim cần cập nhật')
      throw new Error('Missing film id')
    }
    try {
      const data = await updateFilm(id, payload)
      toast.success(data?.message || 'Cập nhật phim thành công')
      navigate('/management/movies')
    } catch (err) {
      toast.error(err?.message || 'Cập nhật phim thất bại')
      throw err
    }
  }

  return (
    <MovieUpsertForm
      title="Chỉnh sửa phim"
      subtitle="Cập nhật thông tin phim trong hệ thống CinemaStar."
      submitLabel="Lưu phim"
      initialData={film}
      loading={loading}
      confirm={{
        title: 'Xác nhận cập nhật phim',
        message: 'Bạn có chắc chắn muốn lưu thay đổi cho phim này không?',
      }}
      onCancel={() => navigate('/management/movies')}
      onSubmit={handleSubmit}
    />
  )
}

export default MovieEdit
