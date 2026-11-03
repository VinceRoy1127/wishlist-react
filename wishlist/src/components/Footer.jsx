import '../styles/Footer.css'
import { CiGift } from "react-icons/ci";


function Footer() {
  return (
    <div className="background">
      <div className="gift-circle-small">
        <CiGift className="gift-icon"/>
      </div>
      <div className="footer-text">
        <p>© 2025 Wishlistr Inc. All rights reserved.</p>
      </div>

    </div>
  )
}


export default Footer