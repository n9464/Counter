// --- CONFIG/FIREBASE ---

const itemToCategory = {
  "Maynards": "candy",
  "Mini chocolat": "candy",
  "Jolly Rancher": "candy",
  "Lolly pops": "candy",
  "Chupa Chups": "candy",
  "Mr Vegy": "noodles",
  "Mr Beef": "noodles",
  "Mr Spicy": "noodles",
  "Mr Chicken": "noodles",
  "Sprite": "pop",
  "Coke": "pop",
  "Rootbeer": "pop",
  "Dr Pepper": "pop",
  "Crush Orange": "pop",
  "Crush Rose": "pop",
  "Crush Mauve": "pop",
  "Canada dry": "pop",
  "Gatorade Bleu": "gatorade",
  "Gatorade Rouge": "gatorade",
  "Gatorade Orange": "gatorade",
  "Gatorade Jaune": "gatorade",
  "Gatorade Mini": "gatorade",
  "Lays BBQ": "chips",
  "Lays Classic": "chips",
  "Doritos": "chips",
  "Cheetos": "chips",
  "Ruffles All Dressed": "chips",
  "Ruffles Sour/Onion": "chips",
  "Snickers": "chocolate",
  "Cookie & Cream": "chocolate",
  "Coffee Crisp": "chocolate",
  "Mars": "chocolate",
  "Hersheys": "chocolate",
  "Twix": "chocolate",
  "Aero": "chocolate",
  "Aero Mint": "chocolate",
  "Caramilk": "chocolate",
  "KitKat": "chocolate",
  "Popcorn": "popcorn",
  "Pop-smores": "tart",
  "Pop-fudge": "tart",
  "Pop-Rasberry": "tart",
  "Pop-Strawberry": "tart",
  "Pop-Blueberry": "tart",
  "Tubes-Rasberry": "tube",
  "Tubes-Banana": "tube",
  "Tubes-Strawberry": "tube",
  "Seaweed": "popcorn",
  "Iced Tea": "juice",
  "Peach Punch": "juice",
  "Fruit Punch": "juice"
};

const categoryLabels = {
  "candy": "🍭 Candy",
  "noodles": "🍜 Noodles",
  "pop": "🥤 Pop",
  "gatorade": "⚡ Gatorade",
  "chips": "🍟 Chips",
  "chocolate": "🍫 Chocolate",
  "popcorn": "🍿 Snacks",
  "juice": "🧃 Juice",
  "tart": "🧁 Pop Tarts",
  "tube": "🍨 Frozen"
};

const categoryColors = {
  "candy": "#ff1493",
  "noodles": "#ffa500",
  "pop": "#00d4ff",
  "gatorade": "#39ff14",
  "chips": "#ffff00",
  "chocolate": "#8b4513",
  "popcorn": "#ff69b4",
  "juice": "#ff8c00",
  "tart": "#ff00ff",
  "tube": "#00ff7f"
};

const firebaseConfig = {
  apiKey: "AIzaSyCZdd01uYMq2b3pACHRgJQ7xtQJ6D2kGf8",
  authDomain: "canteen-tracker.firebaseapp.com",
  projectId: "canteen-tracker",
  storageBucket: "canteen-tracker.firebasestorage.app",
  messagingSenderId: "628568313108",
  appId: "1:628568313108:web:ff300eb4aa53cf15908601",
  measurementId: "G-1NPKZBZMM6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- UI STATE ---

let user = null;
let order = [];
let items = [];
let activeCategory = null;
let unsubscribe = null;

// --- DOM ELEMENTS ---
const loginSection = document.getElementById('login-section');
const orderSection = document.getElementById('order-section');
const receiptModal = document.getElementById('receipt-modal');
const loginForm = document.getElementById('login-form');
const firstInitialInput = document.getElementById('first-initial');
const lastNameInput = document.getElementById('last-name');
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const categoryTabs = document.getElementById('category-tabs');
const itemsGrid = document.getElementById('items-grid');
const checkoutBtn = document.getElementById('checkout-btn');
const orderTotal = document.getElementById('order-total');
const itemCountSpan = document.getElementById('item-count');
const receiptContent = document.getElementById('receipt-content');

// --- LOGIN HANDLER ---
loginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const firstInitial = firstInitialInput.value.trim().toUpperCase();
  const lastName = lastNameInput.value.trim();
  
  if (!firstInitial || firstInitial.length !== 1 || !/[A-Z]/.test(firstInitial)) {
    alert('Please enter a valid first initial (single letter)');
    return;
  }
  
  if (!lastName || !/^[A-Za-z]+$/.test(lastName)) {
    alert('Please enter a valid last name (letters only)');
    return;
  }
  
  const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  user = { 
    name: `${firstInitial}.${formattedLastName}`,
    rawLast: lastName 
  };
  
  firstInitialInput.value = '';
  lastNameInput.value = '';
  
  loginSection.style.display = 'none';
  orderSection.style.display = 'block';
  usernameSpan.textContent = user.name;
  
  fetchAndDisplayItems();
});

// --- LOGOUT FUNCTION ---
function logOut() {
  user = null;
  order = [];
  activeCategory = null;
  loginSection.style.display = 'block';
  orderSection.style.display = 'none';
  receiptModal.style.display = 'none';
  
  // Unsubscribe from real-time updates
  if (unsubscribe) {
    unsubscribe();
  }
  
  if (window.logoutTimer) {
    clearTimeout(window.logoutTimer);
  }
}

logoutBtn.addEventListener('click', logOut);

// --- FETCH ITEMS FROM FIRESTORE ---
async function fetchAndDisplayItems() {
  try {
    console.log('Fetching items from Firestore...');
    
    const querySnapshot = await db.collection('finances').get();
    
    console.log('Query snapshot size:', querySnapshot.size);
    console.log('Documents:', querySnapshot.docs.length);
    
    if (querySnapshot.empty) {
      console.error('No items found in database');
      alert('No items found in database. Please check your Firestore setup.');
      return;
    }
    
    items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document data:', data);
      
      const itemName = data["Item"];
      const price = data["Prix de vente"];
      const stock = data["# en stock"];
      
      return {
        id: doc.id,
        Item: itemName,
        "Prix de vente": parseFloat(price) || 0,
        "# en stock": parseInt(stock) || 0,
        category: itemToCategory[itemName] || 'other'
      };
    });
    
    console.log('Items loaded:', items);
    
    // Set default category to first available
    const categories = [...new Set(items.map(i => i.category))].sort();
    console.log('Categories found:', categories);
    
    activeCategory = categories[0] || 'candy';
    
    displayCategoryTabs();
    displayItems();
    
    // Real-time updates from Firestore
    unsubscribe = db.collection('finances').onSnapshot(
      querySnapshot => {
        console.log('Real-time update received');
        
        items = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const itemName = data["Item"];
          const price = data["Prix de vente"];
          const stock = data["# en stock"];
          
          return {
            id: doc.id,
            Item: itemName,
            "Prix de vente": parseFloat(price) || 0,
            "# en stock": parseInt(stock) || 0,
            category: itemToCategory[itemName] || 'other'
          };
        });
        
        displayItems();
      },
      error => {
        console.error('Real-time listener error:', error);
      }
    );
    
  } catch (error) {
    console.error('Error loading items:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    alert(`Error loading items: ${error.message}`);
  }
}

// --- DISPLAY CATEGORY TABS ---
function displayCategoryTabs() {
  categoryTabs.innerHTML = '';
  
  const categories = [...new Set(items.map(i => i.category))].sort();
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
    btn.textContent = categoryLabels[cat] || cat;
    btn.style.borderColor = categoryColors[cat] || '#00d4ff';
    
    if (cat === activeCategory) {
      btn.style.background = `linear-gradient(135deg, ${categoryColors[cat]}, ${categoryColors[cat]}cc)`;
    }
    
    btn.addEventListener('click', () => {
      activeCategory = cat;
      displayCategoryTabs();
      displayItems();
    });
    
    categoryTabs.appendChild(btn);
  });
}

// --- DISPLAY ITEMS ---
function displayItems() {
  itemsGrid.innerHTML = '';
  
  const filteredItems = items.filter(item => item.category === activeCategory);
  const categoryColor = categoryColors[activeCategory] || '#00d4ff';
  
  if (filteredItems.length === 0) {
    itemsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #a0a0a0;">No items in this category</p>';
    return;
  }
  
  filteredItems.forEach((item, index) => {
    const inOrder = order.find(o => o.id === item.id);
    const stock = item["# en stock"] || 0;
    const isOutOfStock = stock <= 0;
    
    const btn = document.createElement('button');
    btn.className = 'item-button' + (inOrder ? ' selected' : '');
    btn.disabled = isOutOfStock;
    
    // Set category-specific color dynamically
    btn.style.setProperty('--item-color', categoryColor);
    
    btn.innerHTML = `
      <span>${item.Item}</span>
      <span class="price">$${item["Prix de vente"].toFixed(2)}</span>
      <span class="stock">${stock} left</span>
    `;
    
    if (!isOutOfStock) {
      btn.addEventListener('click', () => addItemToOrder(item));
    }
    
    itemsGrid.appendChild(btn);
  });
  
  updateOrderSummary();
}

// --- ADD ITEM TO ORDER ---
function addItemToOrder(item) {
  const existingItem = order.find(o => o.id === item.id);
  
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    order.push({
      id: item.id,
      name: item.Item,
      price: item["Prix de vente"],
      qty: 1
    });
  }
  
  displayItems();
}

// --- UPDATE ORDER SUMMARY ---
function updateOrderSummary() {
  let totalItems = 0;
  let totalPrice = 0;
  
  order.forEach(item => {
    totalItems += item.qty;
    totalPrice += item.price * item.qty;
  });
  
  itemCountSpan.textContent = totalItems;
  orderTotal.textContent = '$' + totalPrice.toFixed(2);
  checkoutBtn.disabled = totalItems === 0;
}

// --- CHECKOUT ---
checkoutBtn.addEventListener('click', showReceipt);

function showReceipt() {
  receiptContent.innerHTML = renderReceipt();
  receiptModal.style.display = 'flex';
  orderSection.style.display = 'none';
  
  window.logoutTimer = setTimeout(() => {
    receiptModal.style.display = 'none';
    logOut();
  }, 5000);
}

// --- RENDER RECEIPT ---
function renderReceipt() {
  const timestamp = new Date();
  const totalPrice = order.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  return `
    <div class="receipt-user">
      <span>User:</span>
      <span>${user.name}</span>
    </div>
    <div class="receipt-time">
      <span>Time:</span>
      <span>${timestamp.toLocaleString()}</span>
    </div>
    <div class="receipt-list">
      ${order.map(item => `
        <div class="receipt-line">
          <span>${item.name}</span>
          <span><span class="qty">${item.qty}x</span> $${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('')}
      <div class="receipt-total">
        <span>Total:</span>
        <span>$${totalPrice.toFixed(2)}</span>
      </div>
    </div>
  `;
}

// --- DISMISS RECEIPT ON BACKGROUND CLICK ---
receiptModal.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-bg') || e.target === receiptModal) {
    if (window.logoutTimer) {
      clearTimeout(window.logoutTimer);
    }
    receiptModal.style.display = 'none';
    logOut();
  }
});
