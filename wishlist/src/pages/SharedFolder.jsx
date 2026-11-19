import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/useAuth'
import { supabase } from '../utils/supabase'
import { acceptFolderEditLink, getSharedFolder } from '../utils/folderWorkspace'
import '../styles/Gifts.css'

function SharedFolder() {
  const { token } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [folder, setFolder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const sharedFolder = await getSharedFolder(token)
        if (!active) return
        setFolder(sharedFolder)
        if (sharedFolder.access_level === 'edit' && user) {
          const folderId = await acceptFolderEditLink(token)
          if (active) navigate(`/folders/${folderId}`, { replace: true })
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [authLoading, navigate, token, user])

  const signInLink = `/account?redirect=${encodeURIComponent(window.location.pathname)}`

  return (
    <>
      <Header />
      <main className="folder-page">
        <p><Link to="/">← Home</Link></p>
        {loading ? <p>Loading shared folder…</p> : error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : folder ? (
          <>
            <header className="folder-heading">
              <h2>{folder.name}</h2>
              <p>{folder.access_level === 'read' ? 'Read-only shared folder' : 'Edit access'}</p>
            </header>
            {folder.access_level === 'edit' && !user && (
              <p className="folder-notice">
                Sign in to collaborate and edit this folder. <Link to={signInLink}>Sign in or create an account</Link>.
              </p>
            )}
            <section className="folder-gifts">
              <h3>Gifts, ranked by priority</h3>
              {folder.gifts.length ? (
                <div className="gift-grid">
                  {folder.gifts.map((gift) => (
                    <article className="gift-card" key={gift.id}>
                      <a href={gift.link} target="_blank" rel="noreferrer">{gift.title}</a>
                      <p>{gift.link}</p>
                      <p>Priority: {gift.priority}/5</p>
                    </article>
                  ))}
                </div>
              ) : <p className="folder-empty">No gifts in this folder yet.</p>}
            </section>
          </>
        ) : null}
        {!supabase && <p className="folder-notice">Connect a Supabase project to open shared folders.</p>}
      </main>
      <Footer />
    </>
  )
}

export default SharedFolder
