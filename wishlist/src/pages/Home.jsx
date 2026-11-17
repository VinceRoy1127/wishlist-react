import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import WishCard from "../components/WishCard";
import { loadWishlist, saveWishlist } from "../utils/wishlist";
import "../styles/Wishlist.css";

function Home() {
  const [wishlist, setWishlist] = useState(loadWishlist);

  function toggleMostWanted(id) {
    const updatedWishlist = wishlist.map((wish) => ({
      ...wish,
      mostWanted: wish.id === id ? !wish.mostWanted : false,
    }));
    saveWishlist(updatedWishlist);
    setWishlist(updatedWishlist);
  }

  function removeWish(id) {
    const updatedWishlist = wishlist.filter((wish) => wish.id !== id);
    saveWishlist(updatedWishlist);
    setWishlist(updatedWishlist);
  }

  return (
    <>
      <Header />
      <main className="wishlist-page">
        <header className="wishlist-heading">
          <h2>Your wishlist</h2>
          <p>Keep all the things you&apos;re hoping for in one place.</p>
        </header>
        {wishlist.length > 0 ? (
          <section className="wish-grid" aria-label="Wishlist items">
            {wishlist.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                onToggleMostWanted={toggleMostWanted}
                onRemove={removeWish}
              />
            ))}
          </section>
        ) : (
          <p className="wishlist-empty">Your wishlist is empty. Add a gift to get started.</p>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Home;
