// Firebase configuration
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

const firebaseConfig = {
  apiKey: "AIzaSyCZdd01uYMq2b3pACHRgJQ7xtQJ6D2kGf8",
  authDomain: "canteen-tracker.firebaseapp.com",
  projectId: "canteen-tracker",
  storageBucket: "canteen-tracker.firebasestorage.app",
  messagingSenderId: "628568313108",
  appId: "1:628568313108:web:ff300eb4aa53cf15908601",
  measurementId: "G-1NPKZBZMM6"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

// Global Variables
let items = [];
let cart = [];
let activeFilter = null;
let searchTerm = '';
let isAnimating = false;

// Load items and sales report when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchItems();
  displaySalesReport();
  initializeSearchAndFiltering();
  initializeKeyboardNavigation();
});

// Initialize keyboard navigation for accessibility
function initializeKeyboardNavigation() {
  // Add keyboard event listener to the grid container
  const gridContainer = document.querySelector('.grid-container');
  if (gridContainer) {
    gridContainer.addEventListener('keydown', handleGridKeydown);
  }
  
  // Make legend items keyboard accessible
  const legendItems = document.querySelectorAll('.legend-item');
  legendItems.forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', handleLegendKeydown);
  });
}

function handleGridKeydown(e) {
  if (e.target.classList.contains('item-card')) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.target.click();
    }
  }
}

function handleLegendKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.target.click();
  }
}

// Fetch items from Firestore (from finances collection)
async function fetchItems() {
  try {
    const querySnapshot = await db.collection('finances').get();
    items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data["Item"],
        price: parseFloat(data["Prix de vente"]),
        stock: parseInt(data["# en stock"]) || 0,
        category: itemToCategory[data["Item"]] || "other",
      };
    });
    items.sort((a, b) => a.category.localeCompare(b.category));
    displayItems();
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Display items with enhanced accessibility and feedback
function displayItems() {
  if (isAnimating) return;
  
  const itemsContainer = document.getElementById('items');
  
  // Get current items in DOM
  const currentItems = Array.from(itemsContainer.children);
  
  // Determine which items should be shown
  let filteredItems = [...items];
  
  // Apply search filter
  if (searchTerm) {
    filteredItems = filteredItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply category filter - ONLY show items of that category
  if (activeFilter) {
    filteredItems = filteredItems.filter(item => item.category === activeFilter);
  }
  
  // Create map of items that should be visible
  const shouldBeVisible = new Set(filteredItems.map(item => item.id));
  
  // Phase 1: Animate out items that should be hidden
  const itemsToHide = currentItems.filter(card => {
    const itemId = card.dataset.itemId;
    return itemId && !shouldBeVisible.has(itemId);
  });
  
  if (itemsToHide.length > 0) {
    isAnimating = true;
    itemsToHide.forEach(card => {
      card.classList.add('filtering-out');
    });
    
    // Remove hidden items after animation
    setTimeout(() => {
      itemsToHide.forEach(card => {
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
      });
      
      // Phase 2: Add new items or update existing ones
      updateVisibleItems(filteredItems, itemsContainer);
      isAnimating = false;
    }, 300);
  } else {
    // No items to hide, just update visible items
    updateVisibleItems(filteredItems, itemsContainer);
  }
  
  // Update results count
  updateResultsCount(filteredItems.length, items.length);
}

function updateVisibleItems(filteredItems, itemsContainer) {
  const currentItems = Array.from(itemsContainer.children);
  const currentItemIds = new Set(currentItems.map(card => card.dataset.itemId).filter(Boolean));
  
  filteredItems.forEach((item) => {
    const originalIndex = items.findIndex(i => i.id === item.id);
    
    // Check if item already exists in DOM
    let itemCard = currentItems.find(card => card.dataset.itemId === item.id);
    
    if (itemCard) {
      // Update existing item
      updateItemCard(itemCard, item, originalIndex);
    } else {
      // Create new item
      itemCard = createItemCard(item, originalIndex);
      itemCard.classList.add('filtering-in');
      itemsContainer.appendChild(itemCard);
      
      // Trigger animation
      setTimeout(() => {
        itemCard.classList.remove('filtering-in');
      }, 50);
    }
  });
}

function createItemCard(item, originalIndex) {
  const itemCard = document.createElement('div');
  const isOutOfStock = item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;
  
  itemCard.className = `item-card ${item.category}${isOutOfStock ? ' out-of-stock' : ''}`;
  itemCard.dataset.itemId = item.id;
  itemCard.dataset.originalIndex = originalIndex; // Store for right-click
  itemCard.tabIndex = isOutOfStock ? -1 : 0;
  itemCard.setAttribute('role', 'button');
  itemCard.setAttribute('aria-label', `${item.name}, $${item.price.toFixed(2)}, ${item.stock} in stock${isOutOfStock ? ', out of stock' : ''}`);
  
  // Left click - Add to cart
  if (!isOutOfStock) {
    itemCard.addEventListener('click', function(e) {
      addToCart(originalIndex);
    });
    
    itemCard.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addToCart(originalIndex);
      }
    });
  }
  
  // Right click - Edit stock
  itemCard.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // Prevent default context menu
    editStock(originalIndex);
  });
  
  const stockClass = isLowStock ? 'low-stock' : '';
  
  itemCard.innerHTML = `
    <h3>${item.name}</h3>
    <div class="item-info">
      <span class="price">$${item.price.toFixed(2)}</span>
      <span class="stock ${stockClass}">${item.stock}</span>
    </div>
  `;
  
  return itemCard;
}

function updateItemCard(itemCard, item, originalIndex) {
  const isOutOfStock = item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;
  
  // Update classes
  itemCard.className = `item-card ${item.category}${isOutOfStock ? ' out-of-stock' : ''}`;
  itemCard.tabIndex = isOutOfStock ? -1 : 0;
  itemCard.setAttribute('aria-label', `${item.name}, $${item.price.toFixed(2)}, ${item.stock} in stock${isOutOfStock ? ', out of stock' : ''}`);
  
  // Update stock display
  const stockElement = itemCard.querySelector('.stock');
  if (stockElement) {
    stockElement.className = `stock ${isLowStock ? 'low-stock' : ''}`;
    stockElement.textContent = item.stock;
  }
  
  // Update event handlers
  const newCard = createItemCard(item, originalIndex);
  itemCard.replaceWith(newCard);
}

// Add item to cart with toast notification
function addToCart(index) {
  const item = items[index];
  if (item.stock > 0) {
    const existingItem = cart.find(ci => ci.id === item.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    item.stock--;
    displayItems();
    updateCart();
    showCartToast(`${item.name} added to cart!`);
  }
}

// Show cart toast notification
function showCartToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.cart-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i> ${message}
  `;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Update and display the cart with animations
function updateCart() {
  const cartContainer = document.getElementById('cart');
  const totalSpan = document.getElementById('total');
  const cartCount = document.querySelector('.cart-item-count');
  
  cartContainer.innerHTML = '';
  let total = 0;
  let itemCount = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    itemCount += item.quantity;

    const cartItem = document.createElement('li');
    cartItem.innerHTML = `
      <div class="cart-item-info">
        <strong>${item.name}</strong><br>
        <small>$${item.price.toFixed(2)} × ${item.quantity} = $${itemTotal.toFixed(2)}</small>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${index})" aria-label="Remove ${item.name} from cart">
        <i class="fas fa-times"></i>
      </button>
    `;
    cartContainer.appendChild(cartItem);
  });

  totalSpan.innerText = total.toFixed(2);
  
  // Update cart item count
  if (cartCount) {
    cartCount.textContent = itemCount;
    cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
  }
  
  // Update checkout button state
  const checkoutBtn = document.querySelector('.checkout-button');
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.innerHTML = cart.length === 0 ? 
      '<i class="fas fa-shopping-cart"></i> Cart is empty' : 
      `<i class="fas fa-credit-card"></i> Checkout ($${total.toFixed(2)})`;
  }
}

// Remove item from cart
function removeFromCart(index) {
  const item = cart[index];
  const originalItem = items.find(i => i.id === item.id);

  if (item.quantity > 1) {
    item.quantity--;
  } else {
    cart.splice(index, 1);
  }
  originalItem.stock++;
  displayItems();
  updateCart();
  showCartToast(`${originalItem.name} removed from cart`);
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

    items.forEach(item => {
      const itemRef = db.collection('finances').doc(item.id);
      batch.update(itemRef, { "# en stock": item.stock });
    });

    await batch.commit();
    console.log('Stock updated successfully.');
  } catch (error) {
    console.error('Error updating stock:', error);
  }
}

// Update Firestore with daily sales report
async function updateSalesReport(cart, totalRevenue) {
  const today = new Date().toISOString().split('T')[0];
  const reportRef = db.collection('salesReports').doc(today);

  try {
    const doc = await reportRef.get();
    let reportData = { date: today, totalRevenue: 0, itemsSold: {} };

    if (doc.exists) {
      reportData = doc.data();
    }

    cart.forEach(item => {
      reportData.itemsSold[item.name] = (reportData.itemsSold[item.name] || 0) + item.quantity;
    });

    reportData.totalRevenue += totalRevenue;

    await reportRef.set(reportData);
    displaySalesReport();
    console.log('Sales report updated.');
  } catch (error) {
    console.error('Error updating sales report:', error);
  }
}

// Fetch and display sales report
async function displaySalesReport() {
  const today = new Date().toISOString().split('T')[0];
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
  updateCart();
  showCartToast('Order completed successfully!');
}

// Edit stock of an item (updates Firestore immediately) - Now triggered by right-click
async function editStock(index) {
  const item = items[index];
  const newStock = parseInt(prompt(`Enter new stock for ${item.name}:`, item.stock));
  if (!isNaN(newStock) && newStock >= 0) {
    item.stock = newStock;
    displayItems();
    try {
      const itemRef = db.collection('finances').doc(item.id);
      await itemRef.update({ "# en stock": newStock });
      console.log('Stock edited successfully.');
      showCartToast(`${item.name} stock updated to ${newStock}`);
    } catch (error) {
      console.error('Error editing stock:', error);
    }
  } else {
    alert('Invalid stock value');
  }
}

// Initialize search and filtering functionality
function initializeSearchAndFiltering() {
    initializeSearchBar();
    initializeLegendFiltering();
}

function initializeSearchBar() {
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', function(e) {
            searchTerm = e.target.value.toLowerCase().trim();
            displayItems();
            updateFilterStatus();
        });
        
        // Add clear search on escape key
        searchBar.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                searchTerm = '';
                displayItems();
                updateFilterStatus();
                this.blur();
            }
        });
    }
}

function initializeLegendFiltering() {
    // Add click event listeners to all legend items
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        item.addEventListener('click', function() {
            const categoryText = this.querySelector('span').textContent.toLowerCase();
            const categoryClass = getCategoryClass(categoryText);
            
            if (activeFilter === categoryClass) {
                // If clicking the same filter, clear it
                clearCategoryFilter();
            } else {
                // Apply new filter
                applyCategoryFilter(categoryClass, this);
            }
            
            displayItems();
            updateFilterStatus();
        });
    });
}

function getCategoryClass(categoryText) {
    const categoryMap = {
        'candy': 'candy',
        'noodles': 'noodles', 
        'pop': 'pop',
        'gatorade': 'gatorade',
        'chips': 'chips',
        'chocolate': 'chocolate',
        'snack': 'popcorn',
        'juice': 'juice',
        'pop tarts': 'tart',
        'frozen yogurt': 'tube'
    };
    
    return categoryMap[categoryText] || categoryText.replace(/\s+/g, '').toLowerCase();
}

function applyCategoryFilter(categoryClass, clickedLegendItem) {
    activeFilter = categoryClass;
    
    // Update legend item active states
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
    });
    clickedLegendItem.classList.add('active');
    clickedLegendItem.setAttribute('aria-pressed', 'true');
}

function clearCategoryFilter() {
    activeFilter = null;
    
    // Remove active class from all legend items
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
    });
}

function clearAllFilters() {
    // Clear search
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.value = '';
    }
    searchTerm = '';
    
    // Clear category filter
    clearCategoryFilter();
    
    // Reset to original state
    displayItems();
    updateFilterStatus();
}

function updateFilterStatus() {
    let statusElement = document.querySelector('.filter-status');
    let clearButton = document.querySelector('.clear-filter');
    let filterControls = document.querySelector('.filter-controls');
    
    // Create filter controls if they don't exist
    if (!filterControls) {
        filterControls = document.createElement('div');
        filterControls.className = 'filter-controls';
        
        statusElement = document.createElement('div');
        statusElement.className = 'filter-status';
        
        clearButton = document.createElement('button');
        clearButton.className = 'clear-filter';
        clearButton.innerHTML = '<i class="fas fa-times"></i> Clear All Filters';
        clearButton.addEventListener('click', clearAllFilters);
        
        filterControls.appendChild(statusElement);
        filterControls.appendChild(clearButton);
        
        // Insert before the grid container
        const gridContainer = document.querySelector('.grid-container');
        if (gridContainer && gridContainer.parentNode) {
            gridContainer.parentNode.insertBefore(filterControls, gridContainer);
        }
    }
    
    // Update status text
    let statusText = '';
    const filterName = activeFilter ? getFilterDisplayName(activeFilter) : null;
    
    if (searchTerm && filterName) {
        statusText = `Search: "${searchTerm}" | Category: ${filterName}`;
    } else if (searchTerm) {
        statusText = `Search: "${searchTerm}"`;
    } else if (filterName) {
        statusText = `Category: ${filterName}`;
    }
    
    if (statusText) {
        statusElement.textContent = statusText;
        filterControls.style.display = 'block';
    } else {
        filterControls.style.display = 'none';
    }
}

function getFilterDisplayName(categoryClass) {
    const displayMap = {
        'candy': 'Candy',
        'noodles': 'Noodles', 
        'pop': 'Pop',
        'gatorade': 'Gatorade',
        'chips': 'Chips',
        'chocolate': 'Chocolate',
        'popcorn': 'Snack',
        'juice': 'Juice',
        'tart': 'Pop Tarts',
        'tube': 'Frozen Yogurt'
    };
    
    return displayMap[categoryClass] || categoryClass;
}

function updateResultsCount(shown, total) {
    let resultsElement = document.querySelector('.results-count');
    
    if (!resultsElement) {
        resultsElement = document.createElement('div');
        resultsElement.className = 'results-count';
        resultsElement.style.cssText = `
            color: var(--text-muted);
            font-size: 12px;
            margin-bottom: 8px;
            text-align: right;
        `;
        
        const gridContainer = document.querySelector('.grid-container');
        if (gridContainer && gridContainer.parentNode) {
            gridContainer.parentNode.insertBefore(resultsElement, gridContainer);
        }
    }
    
    if (shown < total) {
        resultsElement.textContent = `Showing ${shown} of ${total} items`;
        resultsElement.style.display = 'block';
    } else {
        resultsElement.style.display = 'none';
    }
}

// Add hover effects for better UX
function addHoverEffects() {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(4px)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0)';
            }
        });
    });
}

// Initialize hover effects after DOM is loaded
document.addEventListener('DOMContentLoaded', addHoverEffects);
