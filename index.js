const firebaseConfig = {
  apiKey: "AIzaSyCZdd01uYMq2b3pACHRgJQ7xtQJ6D2kGf8",
  authDomain: "canteen-tracker.firebaseapp.com",
  projectId: "canteen-tracker",
  storageBucket: "canteen-tracker.firebasestorage.app",
  messagingSenderId: "628568313108",
  appId: "1:628568313108:web:ff300eb4aa53cf15908601",
  measurementId: "G-1NPKZBZMM6"
};

// Initialize Firebase app
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

// Global Variables
let items = [];
let cart = [];
let cashGiven = 0;

// Load items and sales report when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchItems();
  displaySalesReport(); // Fetch daily sales report
});

// Fetch items from Firestore
async function fetchItems() {
  try {
    const querySnapshot = await db.collection('items').get();
    items = querySnapshot.docs.map(doc => doc.data());
    items.sort((a, b) => a.category.localeCompare(b.category)); // Sort by category
    displayItems();
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Display items in the grid
function displayItems() {
  const itemsContainer = document.getElementById('items');
  itemsContainer.innerHTML = '';
  items.forEach((item, index) => {
    const itemCard = `
      <div class="item-card ${item.category}">
        <h3>${item.name}</h3>
        <div class="item-info">
          <span class="price"><i class="fa fa-dollar-sign"></i> ${item.price.toFixed(2)}</span>
          <span class="stock"><i class="fa fa-box"></i> ${item.stock}</span>
        </div>
        <div class="item-actions">
          <button class="add-to-cart" onclick="addToCart(${index})" ${
      item.stock === 0 ? 'disabled' : ''
    }>
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

// Add item to cart
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

// Update and display the cart
function updateCart() {
  const cartContainer = document.getElementById('cart');
  const totalSpan = document.getElementById('total');
  cartContainer.innerHTML = '';
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

// Remove item from cart
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

// Handle checkout and update Firestore
async function checkout() {
  const total = parseFloat(document.getElementById('total').innerText);
  if (total === 0) {
    alert("Cart is empty!");
    return;
  }

  alert('Order placed successfully!');

  await updateStock();
  await updateSalesReport(cart, total);
  resetCart();
}

// Update stock in Firestore after checkout
async function updateStock() {
  try {
    const batch = db.batch();

    items.forEach((item) => {
      const itemRef = db.collection('items').doc(item.name); // Document ID is the item name
      batch.update(itemRef, { stock: item.stock });
    });

    await batch.commit();
    console.log('Stock updated successfully.');
  } catch (error) {
    console.error('Error updating stock:', error);
  }
}

// 📌 Update Firestore with daily sales report
async function updateSalesReport(cart, totalRevenue) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const reportRef = db.collection('salesReports').doc(today);

  try {
    const doc = await reportRef.get();
    let reportData = { date: today, totalRevenue: 0, itemsSold: {} };

    if (doc.exists) {
      reportData = doc.data();
    }

    cart.forEach(item => {
      if (reportData.itemsSold[item.name]) {
        reportData.itemsSold[item.name] += item.quantity;
      } else {
        reportData.itemsSold[item.name] = item.quantity;
      }
    });

    reportData.totalRevenue += totalRevenue;

    await reportRef.set(reportData);
    displaySalesReport();
    console.log('Sales report updated.');
  } catch (error) {
    console.error('Error updating sales report:', error);
  }
}

// 📌 Fetch and display sales report
async function displaySalesReport() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const reportRef = db.collection('salesReports').doc(today);
  const reportContainer = document.getElementById('data-display');

  try {
    const doc = await reportRef.get();
    if (doc.exists) {
      const report = doc.data();
      let reportHTML = `
        <h3>Sales Report for ${report.date}</h3>
        <p><strong>Total Revenue:</strong> $${report.totalRevenue.toFixed(2)}</p>
        <h4>Items Sold:</h4>
        <ul>
      `;
      Object.entries(report.itemsSold).forEach(([name, quantity]) => {
        reportHTML += `<li>${name}: ${quantity} sold</li>`;
      });
      reportHTML += `</ul>`;

      reportContainer.innerHTML = reportHTML;
    } else {
      reportContainer.innerHTML = `<p>No sales recorded for today.</p>`;
    }
  } catch (error) {
    console.error('Error fetching sales report:', error);
  }
}

// Reset cart and cash after checkout
function resetCart() {
  cart = [];
  cashGiven = 0;
  document.getElementById('cash-given').innerText = '0.00';
  document.getElementById('change-breakdown').innerText = '';
  updateCart();
}

// Edit stock of an item
function editStock(index) {
  const newStock = parseInt(
    prompt(`Enter new stock for ${items[index].name}:`, items[index].stock)
  );
  if (!isNaN(newStock) && newStock >= 0) {
    items[index].stock = newStock;
    displayItems();
    updateStock();
  } else {
    alert('Invalid stock value');
  }
}
