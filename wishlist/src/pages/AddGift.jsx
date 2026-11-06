import Footer from "../components/Footer";
import Header from "../components/Header";
import "../styles/AddGift.css";
import { TbLinkPlus } from "react-icons/tb";
function AddGift() {
  return (
    <>
      <Header />
      
      <div className="AddGift">
        <section className="addg-form">
          <div className="addg-form-text">
            <TbLinkPlus className="addg-form-text-icon" />
            <h3 className="addg-form-text-h3">Quick and Easy Gift Adding</h3>
          </div>
        </section>

      </div>
      <Footer/>
    </>
  );
}

export default AddGift
