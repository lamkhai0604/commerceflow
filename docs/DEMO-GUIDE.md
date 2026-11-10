# Demonstration Guide (S4-T10)

A step-by-step trial of every implemented feature on `https://khai-shop.vercel.app`. Each step lists what to do and what you should see. Note the step number of anything that does not match; findings go to the backlog.

## Before you start

- The API sleeps after 15 minutes without traffic. On the first visit a yellow notice says the server is starting; wait up to two minutes and the page continues on its own.
- Use any email address for guest orders and new accounts (for example `yourname+demo1@example.com`). No email is ever sent and no payment is taken.
- Try the steps on a computer first, then repeat a few on a phone.

## 1. Browse the catalog

| # | Do | Expect |
| --- | --- | --- |
| 1.1 | Open the home page | Hero, six rooms with product counts, four featured products |
| 1.2 | Choose **Lighting** in the header | Lighting products only; the room is underlined in the header |
| 1.3 | Search for `lamp` | "Results for “lamp”", 2 products; room counts are hidden while searching |
| 1.4 | On **Shop all**, choose **Under $100**, then **In stock only**, then sort **Price: low to high** | The list narrows and reorders; the address bar keeps the choices, so reload keeps them |
| 1.5 | Go to page 2 and 3 of **Shop all** | 21 products across 3 pages |
| 1.6 | Open **Compact Sofa, Rust** | "Sold out"; no Add to cart button |

## 2. Cart as a guest

| # | Do | Expect |
| --- | --- | --- |
| 2.1 | Open **Stoneware Mug**, set quantity 2, **Add to cart** | Confirmation with "Qty 2"; the cart badge shows 2 |
| 2.2 | Open the cart (bag icon) | Drawer with the mug, "Add $39.00 more for free shipping", Check out button with the total |
| 2.3 | Increase to 10, then try to go higher | The quantity stops at 10 |
| 2.4 | **Remove** the mug, then **Undo** | The mug comes back at the same quantity |
| 2.5 | Reload the page | The cart is still there (kept in this browser) |

## 3. Guest checkout

| # | Do | Expect |
| --- | --- | --- |
| 3.1 | Click **Check out** | Dialog "How would you like to check out?" with guest and member options |
| 3.2 | **Continue as guest**, then **Place order** with the form empty | Each missing field is named; focus moves to the email field |
| 3.3 | Fill in the form, choose **Payment declined**, **Place order** | Red message: payment declined, no order created; the cart is unchanged |
| 3.4 | Choose **Payment service unavailable**, **Place order** | Message: temporarily unavailable, nothing charged |
| 3.5 | Choose **Payment approved**, choose **Express**, **Place order** | Confirmation page with an order number `CF-XXXXXXXX`, items, address and totals (Express $19.00); the cart is empty |
| 3.6 | Write down the order number, then follow **track this order** | Track an order page |
| 3.7 | Enter the order number and a wrong email | "We could not find an order with that number and email address" |
| 3.8 | Enter the right email (any letter case) | The order with its items and address |

## 4. Account

| # | Do | Expect |
| --- | --- | --- |
| 4.1 | Account menu → **Create account**; use a password of at least 12 characters | "Account created successfully. Please log in."; the log-in form is prefilled with your email |
| 4.2 | Log in | Your name in the header; "You have successfully logged in." at the bottom of the screen |
| 4.3 | Reload the page | You stay logged in |
| 4.4 | Account menu → **Log out** | Signed out; the header shows **Log in** |

## 5. Member cart and checkout

| # | Do | Expect |
| --- | --- | --- |
| 5.1 | While signed out, add **Speckled Cups, Set of 4** to the cart | Cart badge 1 |
| 5.2 | **Check out** → **Log in** in the dialog, and log in | You land on the checkout page as a member; notice "Your cart was saved to your account"; your email is taken from the account |
| 5.3 | Open the site in a private window and log in with the same account | The same cart (it is kept on the server) |
| 5.4 | Change a quantity in one window, reload the other | The change appears in both |
| 5.5 | Place the order with **Payment approved** | Confirmation page with **View order history** |
| 5.6 | Account menu → **Order history**, then open the order | Your orders, newest first; order detail with items, address and totals |
| 5.7 | Log out | The cart badge shows 0; the account's cart stays on the server for the next log-in |

## 6. Stock rule

| # | Do | Expect |
| --- | --- | --- |
| 6.1 | Add 4 × **Oak Nightstand** and check out with **Payment approved** | Message: some items are no longer available in the quantity you chose; no order is created |
| 6.2 | Leave it there (do not buy 3) | The product page says "Only 3 left" and the message names the product and the 3 available. Buying them makes it sold out until an administrator edits the stock (section 8) |

## 7. Phone

Repeat 1.1, 2.1, 3.1 to 3.5 and 5.6 on a phone. Expect: the menu opens from the ☰ button and includes search; filters open from **Filters**; nothing scrolls sideways.

## 8. Administration (needs an administrator account)

Create the account first and grant the role as described in [Administrator accounts](DEPLOYMENT.md#administrator-accounts) (one SQL statement in the Neon console; no password is shared). Then log out and log in again.

| # | Do | Expect |
| --- | --- | --- |
| 8.1 | Account menu | **Administration** is listed (customers do not see it) |
| 8.2 | Open **Administration** → **Orders** | Orders newest first with status, email and total; filter by status; search by order number or part of an email |
| 8.3 | Open an order placed earlier (for example from step 3 or 5) | Items, address, totals, and a History list (empty until you change something) |
| 8.4 | **Mark as shipped**, then **Mark as delivered** | Status changes each time; History shows who did it and when; no more buttons afterwards |
| 8.5 | In the customer's account (Order history) open that order | The same status is shown to the customer |
| 8.6 | Open another confirmed order → **Cancel order**, type a reason, confirm | Status Cancelled, payment Refunded, the reason appears in History; the products' stock goes back up by the ordered quantity |
| 8.7 | Open the same cancelled order in a second tab and try to cancel again | Message that someone else already changed it; the current state is shown; stock does not go up twice |
| 8.8 | **Products and stock**: change a stock number and **Save stock** | "Stock saved"; the storefront shows the new availability |
| 8.9 | Set a product's stock to 3 | The product shows **Only 3 left** in the store and the quantity picker stops at 3 |
| 8.10 | Set stock to 0 | The product shows **Sold out** in the store; set it back to a normal number afterwards |
| 8.11 | **Edit details**: change the price to `20.50` | New orders use the new price; existing orders keep theirs |
| 8.12 | **Hide** a product | It disappears from the store, search and carts; **Show** brings it back |
| 8.13 | Log out and open `/admin` | "Log in to open administration" |
| 8.14 | Log in with a normal (non-admin) account and open `/admin` | "You do not have access to administration" |

| 8.15 | **Products and stock** → **New product**; leave the form empty and press **Create product** | Each missing field is named |
| 8.16 | Type the name `Linen Table Runner` | The address fills itself in (`linen-table-runner`) and shows the page it will have |
| 8.17 | Choose a category, price `34.50`, stock `12`, a description, a photo (**Same photo as …**) and create | "Product created"; it appears in the list and, if shown, in the store with that price and photo |
| 8.18 | Create another product with the same address | "Another product already uses this address"; nothing is created |
| 8.19 | Create a product and leave the photo on **Placeholder** | The product page shows a neutral grey placeholder picture |
| 8.20 | Account menu → **Your account** | Your name, email and an **Administrator** label, with links to order history and administration |

Stock rule in the store (needs step 8.9 first): add 4 of the product with 3 left and check out. Expect a message naming the product and how many are available, and no order.

## What is not in this release

Uploading new product photos (a new product uses a photo already in the store, or a placeholder), customer self-cancellation, emails and real payments. Taxes and returns are demonstration text only.
