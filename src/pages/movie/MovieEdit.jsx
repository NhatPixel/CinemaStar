import { useNavigate, useParams } from 'react-router-dom'
import { MovieUpsertForm } from '../../components'

function MovieEdit() {
  const navigate = useNavigate()
  const { id } = useParams()

  return (
    <MovieUpsertForm
      mode="edit"
      filmId={id}
      onCancel={() => navigate('/management/movies')}
      onSubmitted={() => navigate('/management/movies')}
    />
  )
}

export default MovieEdit
