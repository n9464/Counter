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
let cashGiven = 0;

// Enhanced filtering and search functionality
let activeFilter = null;
let searchTerm = '';

// Load items and sales report when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchItems();
  displaySalesReport();
  initializeSearchAndFiltering();
});

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

// Display items in the grid
function displayItems() {
  const itemsContainer = document.getElementById('items');
  itemsContainer.innerHTML = '';
  
  // Apply current filters when displaying items
  let filteredItems = [...items];
  
  // Apply search filter
  if (searchTerm) {
    filteredItems = filteredItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply category filter by sorting (matching items first)
  if (activeFilter) {
    filteredItems.sort((a, b) => {
      const aMatches = a.category === activeFilter;
      const bMatches = b.category === activeFilter;
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }
  
  filteredItems.forEach((item, index) => {
    // Find the original index in the items array
    const originalIndex = items.findIndex(i => i.id === item.id);
    
    const itemCard = `
      <div class="item-card ${item.category}">
        <h3>${item.name}</h3>
        <div class="item-info">
          <span class="price"><i class="fa fa-dollar-sign"></i> ${item.price.toFixed(2)}</span>
          <span class="stock"><i class="fa fa-box"></i> ${item.stock}</span>
        </div>
        <div class="item-actions">
          <button class="add-to-cart" onclick="addToCart(${originalIndex})" ${item.stock === 0 ? 'disabled' : ''}>
            <i class="fa fa-shopping-cart"></i>
          </button>
          <button class="edit-stock" onclick="editStock(${originalIndex})">
            <i class="fa fa-edit"></i>
          </button>
        </div>
      </div>
    `;
    itemsContainer.innerHTML += itemCard;
  });
  
  // Update results count
  updateResultsCount(filteredItems.length, items.length);
}

// Add item to cart
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
  const originalItem = items.find(i => i.id === item.id);

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
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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

// Edit stock of an item (updates Firestore immediately)
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
            displayItems(); // Re-display items with new filter
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
            
            displayItems(); // Re-display items with new filter
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
    });
    clickedLegendItem.classList.add('active');
}

function clearCategoryFilter() {
    activeFilter = null;
    
    // Remove active class from all legend items
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('active');
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
        clearButton.textContent = 'Clear All Filters';
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