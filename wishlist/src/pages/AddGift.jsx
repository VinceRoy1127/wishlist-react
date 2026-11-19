import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TbLinkPlus } from 'react-icons/tb'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { useAuth } from '../context/useAuth'
import { supabase } from '../utils/supabase'
import { addItem, loadWorkspace } from '../utils/workspace'
import '../styles/AddGift.css'

const ACTIVE_WISHLIST_KEY = 'wishlistr-active-wishlist'

function AddGift() {
  const { user, loading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [wishlists, setWishlists] = useState([])
  const [wishlistId, setWishlistId] = useState(localStorage.getItem(ACTIVE_WISHLIST_KEY) || '')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    loadWorkspace(user).then((workspace) => {
      setWishlists(workspace.wishlists)
      if (!workspace.wishlists.some((wishlist) => wishlist.id === wishlistId)) {
        setWishlistId(workspace.wishlists[0]?.id ?? '')
      }
    }).catch((loadError) => setError(loadError.message))
  }, [authLoading, user, wishlistId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      if (!wishlistId) throw new Error('Create a wishlist before adding a gift.')
      await addItem(wishlistId, { title: title.trim(), link: link.trim() })
      localStorage.setItem(ACTIVE_WISHLIST_KEY, wishlistId)
      navigate('/')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <>
      <Header />
      <div className="AddGift">
        <section className="addg-form">
          <div className="addg-form-text">
            <TbLinkPlus className="addg-form-text-icon" />
            <h3 className="addg-form-text-h3">Quick and Easy Gift Adding</h3>
          </div>
          {supabase && !user ? (
            <p className="addg-fields">
              Sign in to add a gift to your cloud wishlists. <Link to="/account">Open your account</Link>.
            </p>
          ) : <form className="addg-fields" onSubmit={handleSubmit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            <label htmlFor="gift-wishlist">Add to wishlist</label>
            <select id="gift-wishlist" value={wishlistId} required
              onChange={(event) => setWishlistId(event.target.value)}>
              {wishlists.map((wishlist) => (
                <option key={wishlist.id} value={wishlist.id}>{wishlist.name}</option>
              ))}
            </select>
            {!wishlists.length && !error && (
              <p>Create a wishlist on the <Link to="/">home page</Link> before adding a gift.</p>
            )}
            <label htmlFor="gift-title">What do you want?</label>
            <input id="gift-title" name="title" type="text"
              placeholder="e.g. Noise-cancelling headphones" value={title}
              onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
            <label htmlFor="gift-link">Link to the gift</label>
            <input id="gift-link" name="link" type="url" placeholder="https://example.com/gift"
              value={link} onChange={(event) => setLink(event.target.value)} required />
            <button type="submit" className="addg-submit" disabled={!wishlists.length}>
              Add to wishlist
            </button>
          </form>}
        </section>
      </div>
      <Footer />
    </>
  )
}

export default AddGift
