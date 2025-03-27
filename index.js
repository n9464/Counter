import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// 🔥 Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyCZdd01uYMq2b3pACHRgJQ7xtQJ6D2kGf8",
  authDomain: "canteen-tracker.firebaseapp.com",
  projectId: "canteen-tracker",
  storageBucket: "canteen-tracker.firebasestorage.app",
  messagingSenderId: "628568313108",
  appId: "1:628568313108:web:ff300eb4aa53cf15908601",
  measurementId: "G-1NPKZBZMM6"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Variables
let items = [];
let cart = [];
let cashGiven = 0;

// Load items from Firestore when the page loads
document.addEventListener("DOMContentLoaded", () => {
  fetchItems();
});

// 🔄 Fetch items from Firestore instead of items.csv
async function fetchItems() {
  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    displayItems();
  } catch (error) {
    console.error("Error loading items:", error);
  }
}

// 🛒 Display items in the grid
function displayItems() {
  const itemsContainer = document.getElementById("items");
  itemsContainer.innerHTML = "";
  items.forEach((item, index) => {
    const itemCard = `
      <div class="item-card ${item.category}">
        <h3>${item.name}</h3>
        <div class="item-info">
          <span class="price"><i class="fa fa-dollar-sign"></i> ${item.price.toFixed(2)}</span>
          <span class="stock"><i class="fa fa-box"></i> ${item.stock}</span>
        </div>
        <div class="item-actions">
          <button class="add-to-cart" onclick="addToCart(${index})" ${item.stock === 0 ? "disabled" : ""}>
            <i class="fa fa-shopping-cart"></i>
          </button>
          <button class="edit-stock" onclick="editStock(${index})">
            <i class="fa fa-edit"></i>
          </button>
        </div>
      </div>
    `;
    itemsContainer.innerHTML += itemCard;
  });
}

// 🛒 Add item to cart
function addToCart(index) {
  const item = items[index];
  if (item.stock > 0) {
    const existingItem = cart.find((cartItem) => cartItem.name === item.name);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    item.stock--;
    displayItems();
    updateCart();
  }
}

// 🛍️ Update and display the cart
function updateCart() {
  const cartContainer = document.getElementById("cart");
  const totalSpan = document.getElementById("total");
  cartContainer.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    cartContainer.innerHTML += `
      <li>
        ${item.name} x${item.quantity} - $${itemTotal.toFixed(2)}
        <button onclick="removeFromCart(${index})">Remove</button>
      </li>
    `;
  });

  totalSpan.innerText = total.toFixed(2);
}

// ❌ Remove item from cart
function removeFromCart(index) {
  const item = cart[index];
  const originalItem = items.find((i) => i.name === item.name);

  if (item.quantity > 1) {
    item.quantity--;
  } else {
    cart.splice(index, 1);
  }
  originalItem.stock++;
  displayItems();
  updateCart();
}

// ✅ Checkout and update stock in Firestore
async function checkout() {
  alert("Order placed successfully!");

  // 🔄 Update stock in Firestore
  await updateStock();
  resetCart();
}

// 🔄 Update stock in Firestore instead of CSV
async function updateStock() {
  try {
    for (const item of items) {
      const itemRef = doc(db, "items", item.id);
      await updateDoc(itemRef, { stock: item.stock });
    }
    console.log("Stock updated successfully.");
  } catch (error) {
    console.error("Error updating stock:", error);
  }
}

// 💰 Select cash given
function selectCash(amount) {
  cashGiven += amount;
  document.getElementById("cash-given").innerText = cashGiven.toFixed(2);
}

// 🔄 Reset cart and cash after checkout
function resetCart() {
  cart = [];
  cashGiven = 0;
  document.getElementById("cash-given").innerText = "0.00";
  document.getElementById("change-breakdown").innerText = "";
  updateCart();
}

// ✏️ Edit stock of an item
function editStock(index) {
  const newStock = parseInt(
    prompt(`Enter new stock for ${items[index].name}:`, items[index].stock)
  );
  if (!isNaN(newStock) && newStock >= 0) {
    items[index].stock = newStock;
    displayItems();
    updateStock();
  } else {
    alert("Invalid stock value");
  }
}
