// 1. Global Variables and Constants
let items = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let purchaseHistory = JSON.parse(localStorage.getItem("purchaseHistory")) || [];
let cashGiven = 0;

const API_KEY = 'AIzaSyB5Lbyb7TQ8NFA8rvrOoEbQUY8v-kXt73M';
const SPREADSHEET_ID = '1_Y5zRKs4WMZSMijFbA0_9G0Zl7VvO9X3Oyk8rsDEDJo';
const RANGE = 'Finances!A1:A37,C1:C37,H1:H37';

// 2. Utility Functions
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(jsonPayload);
}

function getCategory(name) {
  if (["Maynards", "Mini chocolat", "Jolly Rancher", "Lolly", "Chupa"].some(candy => name.includes(candy))) return "candy";
  if (name.includes("Mr")) return "noodles";
  if (["Crush", "Coke", "Sprite", "Rootbeer", "Dr Pepper", "Canada"].some(drink => name.includes(drink))) return "pop";
  if (name.includes("Gatorade")) return "gatorade";
  if (["Lays", "Doritos", "Cheetos", "Ruffles"].some(chip => name.includes(chip))) return "chips";
  if (name.includes("Popcorn")) return "snack";
  return "chocolate";
}

// 3. Rendering Functions
function renderItems() {
  const itemsDiv = document.getElementById("items"); // Scoped here
  if (!itemsDiv) {
    console.error("Items container not found!");
    return;
  }
  itemsDiv.innerHTML = "";
  items.forEach((item, index) => {
    let price = Number(item.price);
    if (isNaN(price)) console.error("Invalid price for item:", item);
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
        <th>Total Money</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  
  let tbody = table.querySelector("tbody");
  purchaseHistory.forEach(record => {
    let itemDetails = "<ul>";
    record.items.forEach(item => {
      itemDetails += `<li>${item.name} - $${item.price.toFixed(2)} (x${item.quantity})</li>`;
    });
    itemDetails += "</ul>";

    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${record.date}</td>
      <td>${record.itemsSold}</td>
      <td>$${record.moneyMade.toFixed(2)}</td>
      <td>${itemDetails}</td>`;
    tbody.appendChild(tr);
  });
  historyContainer.appendChild(table);
}

// 4. Action Functions
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

function removeFromCart(index) {
  const item = cart[index];
  const product = items.find(i => i.name === item.name);
  if (product) product.stock++;
  cart.splice(index, 1);
  saveData();
  renderCart();
  renderItems();
}

function editStock(index) {
  const newStock = prompt("Enter new stock amount:");
  if (newStock !== null && !isNaN(newStock)) {
    items[index].stock = parseInt(newStock, 10);
    saveData();
    renderItems();
  }
}

function saveData() {
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("purchaseHistory", JSON.stringify(purchaseHistory));
}

function checkout() {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }

  let total = parseFloat(document.getElementById("total").textContent);
  alert("Thank you for your purchase! Total: $" + total.toFixed(2));

  let currentDate = new Date().toLocaleDateString();
  const itemsSummary = cart.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.name);
    if (existing) existing.quantity += 1;
    else acc.push({ name: item.name, price: Number(item.price), quantity: 1 });
    return acc;
  }, []);

  let record = purchaseHistory.find(r => r.date === currentDate);
  if (record) {
    itemsSummary.forEach(newItem => {
      const existingItem = record.items.find(i => i.name === newItem.name);
      if (existingItem) existingItem.quantity += newItem.quantity;
      else record.items.push(newItem);
    });
    record.itemsSold += cart.length;
    record.moneyMade += total;
  } else {
    purchaseHistory.push({
      date: currentDate,
      itemsSold: cart.length,
      moneyMade: total,
      items: itemsSummary
    });
  }

  if (typeof gapi === 'undefined' || !gapi.auth2) {
    console.log("Google API not ready yet. Waiting...");
    setTimeout(() => checkout(), 500);
    return;
  }

  updateStockInSheet();
  cart = [];
  saveData();
  renderCart();
  renderItems();
  renderHistory();
}

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

// 5. Google API Functions
function handleCredentialResponse(response) {
  console.log("Encoded JWT ID token:", response.credential);
  const user = parseJwt(response.credential);
  console.log("User Info:", user);
  if (user.email_verified && user.email === "ncote@evoyageur.ca") {
    console.log("Login successful!");
    // loadGoogleClient() is already called on DOMContentLoaded, no need to call here
  } else {
    alert("Unauthorized access. Please use an authorized account.");
  }
}

function getDataFromSheet() {
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Finances!A1:A37&ranges=Finances!C1:C37&ranges=Finances!H1:H37&key=${API_KEY}`)
    .then(response => {
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('Data from Google Sheets:', data.valueRanges);
      updateItems(data.valueRanges);
      renderItems();
    })
    .catch(error => console.error('Error fetching data:', error));
}

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

function updateStockInSheet() {
  if (typeof gapi === 'undefined' || !gapi.auth2) {
    console.error("gapi.auth2 not available. Ensure Google API is loaded.");
    return;
  }

  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance || !authInstance.isSignedIn.get()) {
    console.error("User not signed in. Prompting sign-in...");
    authInstance.signIn().then(() => {
      console.log("Sign-in successful, updating stock...");
      const token = authInstance.currentUser.get().getAuthResponse().access_token;
      updateStockWithToken(token);
    }).catch(error => console.error("Sign-in failed in updateStockInSheet:", error));
    return;
  }

  const token = authInstance.currentUser.get().getAuthResponse().access_token;
  updateStockWithToken(token);
}

function updateStockWithToken(token) {
  const updatedStock = [items.map(item => item.stock)];
  const range = `Finances!H2:H${items.length + 1}`;
  const requestBody = {
    range: range,
    majorDimension: "COLUMNS",
    values: updatedStock
  };

  console.log("OAuth Token:", token);
  console.log("Request Body:", requestBody);

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) return response.text().then(text => { throw new Error(`HTTP ${response.status}: ${text}`); });
    return response.json();
  })
  .then(data => console.log("Stock updated successfully:", data))
  .catch(error => console.error("Update failed:", error));
}

function loadGoogleClient() {
  function waitForGapi() {
    if (typeof gapi === 'undefined') {
      console.log("gapi not loaded yet. Retrying in 500ms...");
      setTimeout(waitForGapi, 500);
      return;
    }
    console.log("gapi is available. Loading client:auth2...");
    gapi.load('client:auth2', initializeGapi);
  }

  function initializeGapi() {
    console.log("gapi.client:auth2 loaded.");
    gapi.client.init({
      apiKey: API_KEY,
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
          getDataFromSheet();
        }).catch(error => console.error("Initial sign-in failed:", error));
      } else {
        console.log("User already signed in.");
        getDataFromSheet();
      }
    }).catch(error => {
      console.error("Detailed error initializing Google API:", error);
      console.log("Error details:", JSON.stringify(error, null, 2));
    });
  }

  waitForGapi();
}

// 6. Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded. Starting Google Client load...");
  loadGoogleClient();
  renderCart();
  renderHistory();
});