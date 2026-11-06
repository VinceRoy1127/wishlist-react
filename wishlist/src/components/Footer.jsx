import '../styles/Footer.css'
import { CiGift } from "react-icons/ci";


function Footer() {
  return (
    <div className="background">
      <div className="gift-brand">
        <div className="gift-circle-small">
          <CiGift className="gift-icon"/>
        </div>
        <div className="gift-copy">
          <p className="gift-text-bold">Wishlistr</p>
          <p className="gift-text">- Curated gifting simplified</p>
        </div>
        
      </div>
      <div className="footer-text">
        <p>© 2025 Wishlistr Inc. All rights reserved.</p>
        
      </div>

    </div>
  )
}


export default Footer