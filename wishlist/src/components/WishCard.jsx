import React from 'react'
import { useState } from 'react'
function WishCard() {
  const [wish, setWish] = useState([])
  const gift = {
    name: 'Sample Gift',
    description: 'This is a sample gift description.',
    price: '$50',
    imageUrl: 'https://via.placeholder.com/150'
  }
  setWish([...wish, gift])
  }
  return (
    <>

    
    </>
  )
}

export default WishCard