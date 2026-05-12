import { useNavigate } from 'react-router-dom'
import { MovieUpsertForm, useToast } from '../../components'
import { createFilm } from '../../api/film'

function MovieCreate() {
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (payload) => {
    try {
      const data = await createFilm(payload)
      toast.success(data?.message || 'Tạo phim thành công')
      navigate('/management/movies')
    } catch (err) {
      toast.error(err?.message || 'Tạo phim thất bại')
      throw err
    }
  }

  return (
    <MovieUpsertForm
      title="Thêm phim mới"
      subtitle="Nhập thông tin chi tiết để cập nhật phim vào hệ thống CinemaStar."
      submitLabel="Lưu phim"
      onCancel={() => navigate('/management/movies')}
      onSubmit={handleSubmit}
    />
  )
}

export default MovieCreate
