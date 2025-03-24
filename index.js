let items = []; // Initialize items array

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let purchaseHistory = JSON.parse(localStorage.getItem("purchaseHistory")) || [];

// Get the container for items
const itemsDiv = document.getElementById("items");

// Render Items Grid
function renderItems() {
    if (!itemsDiv) {
        console.error("Items container not found!");
        return;
    }
    itemsDiv.innerHTML = "";
    items.forEach((item, index) => {
        let price = Number(item.price);
        if (isNaN(price)) {
            console.error("Invalid price for item:", item);
        }
        itemsDiv.innerHTML += `
            <div class="item-card ${item.category}">
              <h3>${item.name}</h3>
              <div class="item-info">
                <span class="price"><i class="fa fa-dollar-sign"></i> ${price.toFixed(2)}</span>
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
            </div>`;
    });
}

// Add to Cart
function addToCart(index) {
    const item = items[index];
    if (item.stock > 0) {
        cart.push(item);
        item.stock--;
        saveData();
        renderCart();
        renderItems();
    }
}

// Render Cart
function renderCart() {
    const cartUl = document.getElementById("cart");
    let total = 0;
    cartUl.innerHTML = "";
    cart.forEach((item, index) => {
        total += Number(item.price);
        cartUl.innerHTML += `<li>${item.name} - $${Number(item.price).toFixed(2)}
        <button onclick="removeFromCart(${index})">Remove</button></li>`;
    });
    document.getElementById("total").textContent = total.toFixed(2);
}

// Remove from Cart
function removeFromCart(index) {
    const item = cart[index];
    const product = items.find(i => i.name === item.name);
    if (product) {
        product.stock++;
    }
    cart.splice(index, 1);
    saveData();
    renderCart();
    renderItems();
}

// Edit Stock Manually
function editStock(index) {
    const newStock = prompt("Enter new stock amount:");
    if (newStock !== null && !isNaN(newStock)) {
      items[index].stock = parseInt(newStock, 10);
        saveData();
        renderItems();
    }
}

// Save Data Locally
function saveData() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("purchaseHistory", JSON.stringify(purchaseHistory));
}

// Checkout Function
function checkout() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    let total = parseFloat(document.getElementById("total").textContent);
    let itemsSold = cart.length;
    alert("Thank you for your purchase! Total: $" + total.toFixed(2));

    let currentDate = new Date().toLocaleDateString();
    let record = purchaseHistory.find(r => r.date === currentDate);
    if (record) {
        record.itemsSold += itemsSold;
        record.moneyMade += total;
    } else {
        purchaseHistory.push({ date: currentDate, itemsSold: itemsSold, moneyMade: total });
    }

    // Update stock in Google Sheets after purchase
    updateStockInSheet();

    // Clear cart and save
    cart = [];
    saveData();
    renderCart();
    renderItems();
    renderHistory();
}

function updateStockInSheet() {
  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance || !authInstance.isSignedIn.get()) {
    console.error("User not signed in. Prompting sign-in...");
    authInstance.signIn().then(() => {
      console.log("Sign-in successful, retrying stock update...");
      updateStockInSheet(); // Retry after sign-in
    }).catch(error => {
      console.error("Sign-in failed:", error);
    });
    return;
  }
  console.log("User is signed in. Updating stock...");
  const updatedStock = [items.map(item => item.stock)];
  const range = `Finances!H2:H${items.length + 1}`; // Dynamic range
  const requestBody = {
    range: range,
    majorDimension: "COLUMNS",
    values: updatedStock
  };
  const token = authInstance.currentUser.get().getAuthResponse().access_token;
  console.log("OAuth Token:", token);
  console.log("Request Body:", requestBody);

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => console.log("Stock updated successfully:", data))
  .catch(error => console.error("Error updating stock:", error));
}

// Cash Handling
let cashGiven = 0;

function selectCash(amount) {
    cashGiven += amount;
    document.getElementById("cash-given").textContent = cashGiven.toFixed(2);
    calculateChange();
}

function calculateChange() {
    const total = parseFloat(document.getElementById("total").textContent);
    let change = cashGiven - total;

    if (change < 0) {
        document.getElementById("change-breakdown").textContent = "Not enough cash.";
        return;
    }

    document.getElementById("change-breakdown").textContent = change.toFixed(2);
}

// Render Purchase History
function renderHistory() {
    let historyContainer = document.getElementById("history");
    if (!historyContainer) {
        historyContainer = document.createElement("div");
        historyContainer.id = "history";
        document.body.appendChild(historyContainer);
    }
    historyContainer.innerHTML = "<h2>Purchase History</h2>";
    if (purchaseHistory.length === 0) {
        historyContainer.innerHTML += "<p>No purchases yet.</p>";
        return;
    }
    let table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Items Sold</th>
                <th>Money Made</th>
            </tr>
        </thead>
        <tbody></tbody>`;

    let tbody = table.querySelector("tbody");
    purchaseHistory.forEach(record => {
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.itemsSold}</td>
            <td>$${record.moneyMade.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
    historyContainer.appendChild(table);
}

// Load Data from Google Sheets
document.addEventListener("DOMContentLoaded", function () {
    getDataFromSheet(); // Load data from Google Sheets when the page loads
    renderCart();
    renderHistory();
});

// API Key and Google Sheets Info
const API_KEY = 'AIzaSyB5Lbyb7TQ8NFA8rvrOoEbQUY8v-kXt73M';
const SPREADSHEET_ID = '1_Y5zRKs4WMZSMijFbA0_9G0Zl7VvO9X3Oyk8rsDEDJo';
const RANGE = 'Finances!A1:A37,C1:C37,H1:H37';

// Fetch Data from Google Sheets
function getDataFromSheet() {
    fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Finances!A1:A37&ranges=Finances!C1:C37&ranges=Finances!H1:H37&key=${API_KEY}`
    )
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data from Google Sheets:', data.valueRanges);
            updateItems(data.valueRanges);
            renderItems();
        })
        .catch(error => console.error('Error:', error));
}

// Update Items Array with Google Sheets Data
function updateItems(data) {
    const columnA = data[0].values; // Item names
    const columnC = data[1].values; // Prices
    const columnH = data[2].values; // Stock quantities

    items = columnA.slice(1).map((name, index) => ({
        name: name[0],
        price: parseFloat(columnC[index + 1][0]),
        stock: parseInt(columnH[index + 1][0]),
        category: getCategory(name[0]),
    }));
}

// Get Category Based on Item Name
function getCategory(name) {
  if (["Maynards", "Mini chocolat", "Jolly Rancher", "Lolly", "Chupa"].some(candy => name.includes(candy))) {
    return "candy";
}
    if (name.includes("Mr")) return "noodles";
    if (["Crush", "Coke", "Sprite", "Rootbeer", "Dr Pepper", "Canada"].some(drink => name.includes(drink))) {
      return "pop";
  }
  
    if (name.includes("Gatorade")) return "gatorade";
    if (["Lays", "Doritos", "Cheetos", "Ruffles"].some(drink => name.includes(drink))) {
      return "chips";
    }
  
  if (name.includes("Popcorn")) return "snack";
  return "chocolate"
    
}
function handleCredentialResponse(response) {
  console.log("Encoded JWT ID token: " + response.credential);
  
  // Decode the JWT token to get user information
  const user = parseJwt(response.credential);
  console.log("User Info:", user);

  // Check if user email is allowed
  if (user.email_verified && user.email === "ncote@evoyageur.ca") {
      console.log("Login successful!");
      loadGoogleSheetsAPI(); // Load the Google Sheets API after login
  } else {
      alert("Unauthorized access. Please use an authorized account.");
  }
}

// Decode JWT to get user info
function parseJwt(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// Load Google Sheets API after login
function loadGoogleSheetsAPI() {
  gapi.load('client', () => {
      gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
      }).then(() => {
          console.log("Google Sheets API loaded successfully.");
      }, error => {
          console.error("Error loading Google Sheets API:", error);
      });
  });
}

function authenticate() {
  return gapi.auth2.getAuthInstance()
      .signIn({ scope: "https://www.googleapis.com/auth/spreadsheets" })
      .then(function () {
          console.log("Sign-in successful");
      }, function (error) {
          console.error("Error signing in", error);
      });
}
function loadClient() {
  gapi.client.setApiKey(API_KEY);
  return gapi.client.load("https://sheets.googleapis.com/$discovery/rest?version=v4")
      .then(function () {
          console.log("GAPI client loaded for API");
      }, function (error) {
          console.error("Error loading GAPI client for API", error);
      });
}
const headers = new Headers({
  "Authorization": `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
});
// Initialize Google API client library and authenticate the user
// Function to initialize the Google API client and authenticate the user
 // Ensure this is in your index.js
function loadGoogleClient() {
  if (typeof gapi === 'undefined') {
    console.error("gapi is not loaded. Ensure <script src='https://apis.google.com/js/api.js'> is included.");
    return;
  }

  gapi.load('client:auth2', () => {
    console.log("gapi.client:auth2 loaded.");
    gapi.client.init({
      apiKey: 'AIzaSyB5Lbyb7TQ8NFA8rvrOoEbQUY8v-kXt73M', // Your API key
      clientId: '438989169136-altbqvh21k2onkpjoqo750gfvjmstade.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
    }).then(() => {
      console.log("Google API initialized successfully.");
      const authInstance = gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        console.log("User not signed in. Prompting sign-in...");
        authInstance.signIn().then(() => {
          console.log("User signed in successfully!");
          getDataFromSheet(); // Load initial data
        }).catch(error => {
          console.error("Sign-in failed:", error);
        });
      } else {
        console.log("User already signed in.");
        getDataFromSheet();
      }
    }).catch(error => {
      console.error("Error initializing Google API:", error);
    });
  });
}

// Call this only after the DOM and gapi script are loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Loading Google Client...");
  loadGoogleClient();
});