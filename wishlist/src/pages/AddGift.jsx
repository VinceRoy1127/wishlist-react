import Footer from "../components/Footer";
import Header from "../components/Header";
import "../styles/AddGift.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TbLinkPlus } from "react-icons/tb";
import { loadWishlist, saveWishlist } from "../utils/wishlist";

function AddGift() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const wishlist = loadWishlist();
    saveWishlist([
      ...wishlist,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        link: link.trim(),
        mostWanted: wishlist.length === 0,
      },
    ]);
    navigate("/");
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
          <form className="addg-fields" onSubmit={handleSubmit}>
            <label htmlFor="gift-title">What do you want?</label>
            <input
              id="gift-title"
              name="title"
              type="text"
              placeholder="e.g. Noise-cancelling headphones"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
            />
            <label htmlFor="gift-link">Link to the gift</label>
            <input
              id="gift-link"
              name="link"
              type="url"
              placeholder="https://example.com/gift"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              required
            />
            <button type="submit" className="addg-submit">Add to wishlist</button>
          </form>
        </section>
      </div>
      <Footer />
    </>
  );
}

export default AddGift
