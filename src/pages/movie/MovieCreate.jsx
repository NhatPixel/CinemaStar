import { useNavigate } from 'react-router-dom'
import { MovieUpsertForm } from '../../components'

function MovieCreate() {
  const navigate = useNavigate()

  return (
    <MovieUpsertForm
      mode="create"
      onCancel={() => navigate('/management/movies')}
      onSubmitted={() => navigate('/management/movies')}
    />
  )
}

export default MovieCreate
