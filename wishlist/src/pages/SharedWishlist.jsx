import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSharedWishlist } from '../utils/workspace'
import '../styles/Wishlist.css'

function SharedWishlist() {
  const { token } = useParams()
  const [wishlist, setWishlist] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSharedWishlist(token).then(setWishlist).catch((loadError) => setError(loadError.message))
  }, [token])

  return (
    <main className="wishlist-page">
      <p><Link to="/">Wishlistr</Link> · Shared wishlist</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!error && !wishlist && <p>Loading wishlist…</p>}
      {wishlist && (
        <>
          <header className="wishlist-heading">
            <h2>{wishlist.name}</h2>
            <p>Shared with you · Read-only</p>
          </header>
          {wishlist.items?.length ? (
            <section className="wish-grid" aria-label="Shared wishlist items">
              {wishlist.items.map((wish) => (
                <article className={`wish-card${wish.most_wanted ? ' wish-card-most-wanted' : ''}`} key={wish.id}>
                  {wish.most_wanted && <span className="wish-card-badge">Most wanted</span>}
                  <a className="wish-card-title" href={wish.link} target="_blank" rel="noreferrer">{wish.title}</a>
                  <a className="wish-card-link" href={wish.link} target="_blank" rel="noreferrer">{wish.link}</a>
                </article>
              ))}
            </section>
          ) : <p className="wishlist-empty">This wishlist is empty.</p>}
        </>
      )}
    </main>
  )
}

export default SharedWishlist
