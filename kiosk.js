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
  "favorites": "⭐ Favorites",
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
  "favorites": "#ff69b4",
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

// Function to calculate points: (price in cents) * 1.2, rounded to nearest 10
function calculatePoints(priceInDollars) {
  const priceInCents = Math.round(priceInDollars * 100);
  const points = priceInCents * 1.2;
  return Math.round(points / 10) * 10;
}

// Function to convert points to dollars: f(x) = (0.001x)^(1+0.001x)
function pointsToDollars(points) {
  const x = points;
  const base = 0.001 * x;
  const exponent = 1 + 0.001 * x;
  return Math.pow(base, exponent);
}

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
let userStats = null;
let order = [];
let items = [];
let favoriteItemsWithCategories = [];
let activeCategory = null;
let unsubscribe = null;

// --- DOM ELEMENTS ---
const loginSection = document.getElementById('login-section');
const orderSection = document.getElementById('order-section');
const receiptModal = document.getElementById('receipt-modal');
const redeemModal = document.getElementById('redeem-modal');
const loginForm = document.getElementById('login-form');
const firstInitialInput = document.getElementById('first-initial');
const lastNameInput = document.getElementById('last-name');
const usernameSpan = document.getElementById('username');
const pointsSpan = document.getElementById('points-display');
const redeemBtn = document.getElementById('redeem-btn');
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
  const userId = `${firstInitial}.${formattedLastName}`;
  
  user = { 
    id: userId,
    firstName: firstInitial,
    lastName: formattedLastName,
    name: userId
  };
  
  firstInitialInput.value = '';
  lastNameInput.value = '';
  
  loginSection.style.display = 'none';
  orderSection.style.display = 'flex';
  usernameSpan.textContent = user.name;
  
  createOrUpdateUser();
  fetchUserStats();
  fetchAndDisplayItems();
});

// --- CREATE OR UPDATE USER IN FIRESTORE ---
async function createOrUpdateUser() {
  try {
    const userRef = db.collection('users').doc(user.id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalSpent: 0,
        totalPoints: 0,
        orderCount: 0
      });
      console.log('New user account created:', user.id);
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
  }
}

// --- FETCH USER STATS ---
async function fetchUserStats() {
  try {
    const userRef = db.collection('users').doc(user.id);
    userRef.onSnapshot(doc => {
      if (doc.exists) {
        userStats = doc.data();
        updatePointsDisplay();
        loadFavorites();
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
  }
}

// --- UPDATE POINTS DISPLAY ---
function updatePointsDisplay() {
  if (pointsSpan && userStats) {
    pointsSpan.textContent = userStats.totalPoints || 0;
    
    // Update redeem button state
    const dollarValue = pointsToDollars(userStats.totalPoints || 0);
    redeemBtn.textContent = `Redeem (${dollarValue.toFixed(2)}$)`;
    redeemBtn.disabled = (userStats.totalPoints || 0) < 10; // Minimum 10 points
  }
}

// --- LOAD FAVORITE ITEMS (MOST ORDERED) ---
async function loadFavorites() {
  try {
    const ordersSnapshot = await db.collection('users').doc(user.id).collection('orders').get();
    
    const itemCounts = {};
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
        });
      }
    });
    
    // Sort items by frequency and get top 8
    const favoriteNames = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
    
    // Map favorite names to items with their categories
    favoriteItemsWithCategories = items.filter(item => favoriteNames.includes(item.Item));
    
    console.log('Favorite items loaded:', favoriteItemsWithCategories);
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
}

// --- LOGOUT FUNCTION ---
function logOut() {
  user = null;
  userStats = null;
  order = [];
  activeCategory = null;
  favoriteItemsWithCategories = [];
  loginSection.style.display = 'block';
  orderSection.style.display = 'none';
  receiptModal.style.display = 'none';
  redeemModal.style.display = 'none';
  
  if (unsubscribe) {
    unsubscribe();
  }
  
  if (window.logoutTimer) {
    clearTimeout(window.logoutTimer);
  }
}

logoutBtn.addEventListener('click', logOut);

// --- REDEEM POINTS ---
redeemBtn.addEventListener('click', showRedeemModal);

function showRedeemModal() {
  const points = userStats.totalPoints || 0;
  const dollarValue = pointsToDollars(points);
  
  const redeemContent = document.getElementById('redeem-content');
  redeemContent.innerHTML = `
    <p>You have <strong>${points} points</strong></p>
    <p>This is worth: <strong>$${dollarValue.toFixed(2)}</strong></p>
    <p style="font-size: 0.9rem; color: #a0a0a0; margin-top: 1rem;">Are you sure you want to redeem all your points?</p>
  `;
  
  redeemModal.style.display = 'flex';
}

function confirmRedeem() {
  redeemPointsToCredit();
}

async function redeemPointsToCredit() {
  try {
    const points = userStats.totalPoints || 0;
    const dollarValue = pointsToDollars(points);
    
    // Update user: set points to 0, add credit to account
    const userRef = db.collection('users').doc(user.id);
    await userRef.update({
      totalPoints: 0,
      storeCredit: firebase.firestore.FieldValue.increment(dollarValue)
    });
    
    alert(`Successfully redeemed ${points} points for $${dollarValue.toFixed(2)} store credit!`);
    redeemModal.style.display = 'none';
    fetchUserStats();
  } catch (error) {
    console.error('Error redeeming points:', error);
    alert('Error redeeming points');
  }
}

// --- FETCH ITEMS FROM FIRESTORE ---
async function fetchAndDisplayItems() {
  try {
    console.log('Fetching items from Firestore...');
    
    const querySnapshot = await db.collection('finances').get();
    
    if (querySnapshot.empty) {
      console.error('No items found in database');
      alert('No items found in database.');
      return;
    }
    
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
        points: calculatePoints(parseFloat(price) || 0),
        category: itemToCategory[itemName] || 'other'
      };
    });
    
    console.log('Items loaded:', items.length);
    
    activeCategory = 'favorites';
    
    displayCategoryTabs();
    displayItems();
    
    // Real-time updates
    unsubscribe = db.collection('finances').onSnapshot(
      querySnapshot => {
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
            points: calculatePoints(parseFloat(price) || 0),
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
    alert(`Error loading items: ${error.message}`);
  }
}

// --- DISPLAY CATEGORY TABS (HORIZONTAL) ---
function displayCategoryTabs() {
  categoryTabs.innerHTML = '';
  
  const allCategories = ['favorites', ...new Set(items.map(i => i.category))].sort();
  
  allCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
    btn.textContent = categoryLabels[cat] || cat;
    btn.style.borderBottomColor = categoryColors[cat] || '#00d4ff';
    
    if (cat === activeCategory) {
      btn.style.background = `linear-gradient(180deg, ${categoryColors[cat]}, ${categoryColors[cat]}cc)`;
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
  
  let filteredItems = [];
  let categoryColor = categoryColors[activeCategory] || '#00d4ff';
  
  if (activeCategory === 'favorites') {
    // Show favorite items - each with their own category color
    filteredItems = favoriteItemsWithCategories;
  } else {
    // Show items by category
    filteredItems = items.filter(item => item.category === activeCategory);
  }
  
  if (filteredItems.length === 0) {
    itemsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #a0a0a0;">No items in this category</p>';
    return;
  }
  
  filteredItems.forEach((item) => {
    const inOrder = order.find(o => o.id === item.id);
    const stock = item["# en stock"] || 0;
    const isOutOfStock = stock <= 0;
    
    // For favorites, use the item's category color; otherwise use the tab color
    const itemColor = activeCategory === 'favorites' ? categoryColors[item.category] : categoryColor;
    
    const btn = document.createElement('button');
    btn.className = 'item-button' + (inOrder ? ' selected' : '');
    btn.disabled = isOutOfStock;
    
    btn.style.setProperty('--item-color', itemColor);
    
    btn.innerHTML = `
      <span>${item.Item}</span>
      <span class="price">$${item["Prix de vente"].toFixed(2)}</span>
      <span class="points-badge">${item.points}⭐</span>
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
      points: item.points,
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
  
  saveOrderToFirestore();
  
  window.logoutTimer = setTimeout(() => {
    receiptModal.style.display = 'none';
    logOut();
  }, 5000);
}

// --- SAVE ORDER TO FIRESTORE & UPDATE STOCK ---
async function saveOrderToFirestore() {
  try {
    const totalPrice = order.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalPoints = order.reduce((sum, item) => sum + (item.points * item.qty), 0);
    const timestamp = new Date();
    const orderId = timestamp.toISOString().replace(/[:.]/g, '-');
    
    const orderData = {
      date: firebase.firestore.FieldValue.serverTimestamp(),
      items: order.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        points: item.points,
        total: item.price * item.qty
      })),
      total: totalPrice,
      totalPoints: totalPoints
    };
    
    // Save order
    await db.collection('users').doc(user.id).collection('orders').doc(orderId).set(orderData);
    console.log('Order saved for user:', user.id);
    
    // Update user stats
    const userRef = db.collection('users').doc(user.id);
    await userRef.update({
      totalSpent: firebase.firestore.FieldValue.increment(totalPrice),
      totalPoints: firebase.firestore.FieldValue.increment(totalPoints),
      orderCount: firebase.firestore.FieldValue.increment(1)
    });
    console.log('User stats updated with', totalPoints, 'points');
    
    // Update stock
    const batch = db.batch();
    
    order.forEach(orderItem => {
      const financeDoc = db.collection('finances').doc(orderItem.id);
      batch.update(financeDoc, {
        "# en stock": firebase.firestore.FieldValue.increment(-orderItem.qty)
      });
    });
    
    await batch.commit();
    console.log('Stock updated');
    
  } catch (error) {
    console.error('Error saving order:', error);
  }
}

// --- RENDER RECEIPT ---
function renderReceipt() {
  const timestamp = new Date();
  const totalPrice = order.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalPoints = order.reduce((sum, item) => sum + (item.points * item.qty), 0);
  
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
          <span><span class="qty">${item.qty}x</span> $${(item.price * item.qty).toFixed(2)} (+${item.points * item.qty}⭐)</span>
        </div>
      `).join('')}
      <div class="receipt-total">
        <span>Total:</span>
        <span>$${totalPrice.toFixed(2)}</span>
      </div>
      <div class="receipt-points">
        <span>Points Earned:</span>
        <span>${totalPoints}⭐</span>
      </div>
    </div>
  `;
}

// --- DISMISS RECEIPT ---
receiptModal.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-bg') || e.target === receiptModal) {
    if (window.logoutTimer) {
      clearTimeout(window.logoutTimer);
    }
    receiptModal.style.display = 'none';
    logOut();
  }
});

// --- DISMISS REDEEM MODAL ---
const redeemModalBg = redeemModal.querySelector('.modal-bg');
redeemModalBg.addEventListener('click', function() {
  redeemModal.style.display = 'none';
});

const cancelRedeemBtn = document.getElementById('cancel-redeem-btn');
if (cancelRedeemBtn) {
  cancelRedeemBtn.addEventListener('click', function() {
    redeemModal.style.display = 'none';
  });
}

const confirmRedeemBtn = document.getElementById('confirm-redeem-btn');
if (confirmRedeemBtn) {
  confirmRedeemBtn.addEventListener('click', confirmRedeem);
}
