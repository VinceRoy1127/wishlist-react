import { CiStar } from 'react-icons/ci'
import { FaStar } from 'react-icons/fa'

function WishCard({ wish, onToggleMostWanted, onRemove }) {
  return (
    <article className={`wish-card${wish.mostWanted ? ' wish-card-most-wanted' : ''}`}>
      {wish.mostWanted && <span className="wish-card-badge">Most wanted</span>}
      <a className="wish-card-title" href={wish.link} target="_blank" rel="noreferrer">
        {wish.title}
      </a>
      <a className="wish-card-link" href={wish.link} target="_blank" rel="noreferrer">
        {wish.link}
      </a>
      <div className="wish-card-actions">
        <button
          type="button"
          className="wish-card-button"
          aria-pressed={wish.mostWanted}
          onClick={() => onToggleMostWanted(wish.id)}
        >
          {wish.mostWanted ? <FaStar aria-hidden="true" /> : <CiStar aria-hidden="true" />}
          {wish.mostWanted ? 'Most wanted' : 'Mark most wanted'}
        </button>
        <button
          type="button"
          className="wish-card-button wish-card-remove"
          onClick={() => onRemove(wish.id)}
        >
          Remove
        </button>
      </div>
    </article>
  )
}

export default WishCard
