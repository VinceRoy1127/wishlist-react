# How to build the Wishlistr card system

This guide explains the next steps in plain language, with small code examples to illustrate the ideas. They are excerpts, not complete components or a finished implementation; adapt them to your app as you build each part.

## What is in place

- [`src/main.jsx`](./src/main.jsx) wraps the app in `BrowserRouter`.
- [`src/App.jsx`](./src/App.jsx) routes `/` to `Home` and `/addgift` to `AddGift`.
- [`src/pages/Home.jsx`](./src/pages/Home.jsx) renders the shared `Header` and `Footer`, but has no wishlist content yet.
- [`src/pages/AddGift.jsx`](./src/pages/AddGift.jsx) has the same shared layout, but no form yet.
- [`src/components/Header.jsx`](./src/components/Header.jsx) already links to the view and add pages.
- [`src/styles/Header.css`](./src/styles/Header.css) and [`src/styles/Footer.css`](./src/styles/Footer.css) style those shared areas. There are no card styles yet.

So far, the app has its page structure and navigation. The wishlist itself is not built yet. Next, decide what information each gift needs, show gifts as cards, and let people add and manage them.

## Recommended first version

Build one small, complete flow first:

1. Decide which details to keep for each gift.
2. Create one card design that can display any gift.
3. Show all the gift cards on the home page.
4. Add a form on `/addgift` so a person can create a gift.
5. Make the same gift list available on both pages and save it in the browser.
6. Add editing, deleting, and filtering after adding and viewing gifts works.

For the first version, save the list in the browser on the current device. Later, if people need to share lists or see them on multiple devices, you will need an online service to store the data.

## 1. Decide what a card contains

Before designing the card, decide what information every gift can have. A useful starting point is:

Each gift needs a name and a unique identity so the app can tell it apart from other gifts. You can also keep an image address, price, product link, notes, and whether someone has reserved it. Require the name, but allow the other details to be left blank. Decide how the card should look when an optional detail is missing.

For example, one gift could be represented by an object like this:

```js
{
  id: crypto.randomUUID(),
  title: "Ceramic pour-over set",
  price: 35,
  url: "https://example.com/item",
  reserved: false,
}
```

Treat the extra fields as optional, and decide what to show when they are not provided.

## 2. Make a reusable card component

Create a new component in `src/components/WishCard.jsx` and its stylesheet in `src/styles/WishCard.css`. Think of this component as a card template: the home page gives it one gift's details, and it displays those details. It should not create or keep a separate copy of the wishlist.

Choose which details to show on the card:

- The item's image, with a fallback when no image URL is supplied.
- Its title, price, and optional notes.
- A link to the product page, if one was provided.
- A reserved status.

Make the card easy to use with a keyboard as well as a mouse. Use clear headings, descriptive text for images, and visible focus indicators. Use actual links for destinations and buttons for actions. Keep the card's appearance in its own stylesheet so it does not affect the header or footer.

The key idea is that the card receives one gift as a prop:

```jsx
function WishCard({ item }) {
  return (
    <article className="wish-card">
      <h2>{item.title}</h2>
      {item.price != null && <p>${item.price}</p>}
    </article>
  );
}
```

This is only the basic shape; add the optional image, product link, notes, and reserved status that your design needs.

## 3. Render the list on the home page

In `src/pages/Home.jsx`, add a heading for the wishlist and a section where the cards will appear. Have the page go through the saved gifts and display one card for each. Give each card a stable identity so React can keep track of it when the list changes.

Plan for two states. When there are gifts, show the card grid. When the list is empty, show a friendly message and an obvious link to `/addgift`. Style the grid to fit as many cards as comfortably fit on the screen; it should naturally use fewer columns on a phone and more on a wider screen.

### How the form data becomes a card

For gifts entered by a person, you do not need to create or edit a `.json` file. The form values are combined into a JavaScript object (often called `gift` or `newItem`). It has the same key/value structure as JSON, but it is created while the app is running.

The flow is:

1. Keep each form field's current value in `AddGift`.
2. When the form is submitted, gather those values into one gift object.
3. Send that object to `App.jsx`, where it is added to the shared wishlist array.
4. `Home` receives the array, loops over it, and gives each gift to `WishCard`.
5. `WishCard` displays the values from the gift it received.

For example, the object created from the form could be:

```js
const gift = {
  id: crypto.randomUUID(),
  title: title,
  price: price,
  url: url,
  reserved: false,
};
```

Here, `title`, `price`, and `url` are values collected from the form. In your app, use the actual state or form values you chose, and validate them before creating the object.

The add page passes the finished object to a callback supplied by `App`:

```js
onAddGift(gift);
```

`App` adds it to the existing list rather than replacing the other gifts. Conceptually, that update is:

```js
setItems((currentItems) => [...currentItems, gift]);
```

Then `Home` passes each item from that list into the card:

```jsx
items.map((item) => <WishCard key={item.id} item={item} />)
```

Inside `WishCard`, `item.title` refers to the title from that particular gift object. So when someone enters “Ceramic pour-over set,” that value travels from the form, into `gift.title`, into the wishlist array, and finally into the card's heading. Keep the property names consistent at every step—for example, use `title` in the form object and read `item.title` in the card.

For the layout, make the grid responsive in `WishCard.css` or a separate page stylesheet rather than setting a fixed number of columns.

## 4. Add the item form

Build the form in `src/pages/AddGift.jsx` using the gift details you decided on. Provide a labeled field for each detail, and make it clear which ones are required. When someone submits the form:

- Check that the required gift name is present and show a useful message if it is missing.
- Make sure an entered price is a valid, non-negative number.
- Create a new gift with its own unique identity and an initial status of not reserved.
- Add the new gift to the same wishlist used by the home page.
- After a successful save, either return to the home page or clearly tell the person the gift was added.

Put validation feedback near the field that needs attention. Keep the form's styling separate from the card's styling.

Think of submission as a short sequence rather than putting every concern into the input fields: validate the entered values, create the gift object described above, then call the function provided by the parent page to add it. Only add the item after required fields pass validation; include optional fields when the person has filled them in.

## 5. Share and persist the list

`Home` and `AddGift` are separate pages. If each page keeps its own list, a gift added on one page will not automatically appear on the other. For this app, keep the main wishlist in `src/App.jsx`, which already contains both routes. Give the home page the current gifts to display, and give the add page a way to send a new gift back to the main list.

Save the list in the browser so it remains after a refresh. When the app starts, load the saved list; whenever it changes, save the updated version. Also decide what the app should do if nothing has been saved yet or if the saved information cannot be read, so a storage problem does not break the page.

If many parts of the app eventually need the wishlist, consider a shared state tool such as React context. If people need to share lists or access them from different devices, browser storage will not be enough; you will need a server and database.

At a high level, the shared state in `App.jsx` holds the list and an add function updates it:

```jsx
const [items, setItems] = useState([]);
const addItem = (item) => setItems((current) => [...current, item]);
```

Pass `items` to `Home` and `addItem` to `AddGift`. To persist changes, load the saved list when the app starts and save it when `items` changes. These are separate steps; make sure your loading logic handles the case where the browser has no saved list yet.

## 6. Finish card actions and polish

Once adding and viewing gifts works, add actions such as reserving a gift and deleting it. Make each action update the main wishlist so the card display and browser-saved list stay in sync. Editing gifts, sorting, categories, and improved image loading can come afterward.

Finally, check the page at both phone and desktop sizes. Try the empty list, add a few gifts, refresh the page, and confirm the gifts remain. Also try invalid form entries and each card action. The project already has lint and build commands that can help catch code errors as you work.
