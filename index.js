// Global variables
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let purchaseHistory = JSON.parse(localStorage.getItem("purchaseHistory")) || [];
let items = [];
let accessToken = null;
const SPREADSHEET_ID = '1_Y5zRKs4WMZSMijFbA0_9G0Zl7VvO9X3Oyk8rsDEDJo'; // Replace with your spreadsheet ID
let cashGiven = 0;

// Initialize Google Auth2
gapi.load('auth2', function() {
    gapi.auth2.init({
        client_id: '438989169136-altbqvh21k2onkpjoqo750gfvjmstade.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/spreadsheets'
    });
});

// Sign in with Google
function signIn() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then(function(googleUser) {
        const profile = googleUser.getBasicProfile();
        if (profile.getEmail() === 'ncote@evoyageur.ca') {
            accessToken = googleUser.getAuthResponse().access_token;
            console.log("Login successful! Access token:", accessToken);
            getDataFromSheet();
        } else {
            alert("Unauthorized access. Please use an authorized account.");
        }
    }).catch(function(error) {
        console.error("Sign-in failed:", error);
    });
}

// Fetch data from Google Sheet
function getDataFromSheet() {
    if (!accessToken) {
        console.log("Please sign in to load data.");
        return;
    }
    fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Finances!A1:A37&ranges=Finances!C1:C37&ranges=Finances!H1:H37`,
        {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        }
    )
    .then(response => {
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('Data from Google Sheets:', data.valueRanges);
        updateItems(data.valueRanges);
        renderItems();
    })
    .catch(error => console.error('Error:', error));
}

// Parse sheet data into items array
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

// Determine item category
function getCategory(name) {
    if (["Maynards", "Mini chocolat", "Jolly Rancher", "Lolly", "Chupa"].some(candy => name.includes(candy))) return "candy";
    if (name.includes("Mr")) return "noodles";
    if (["Crush", "Coke", "Sprite", "Rootbeer", "Dr Pepper", "Canada"].some(drink => name.includes(drink))) return "pop";
    if (name.includes("Gatorade")) return "gatorade";
    if (["Lays", "Doritos", "Cheetos", "Ruffles"].some(chip => name.includes(chip))) return "chips";
    if (name.includes("Popcorn")) return "snack";
    return "chocolate";
}

// Render items in the grid
function renderItems() {
    const itemsDiv = document.getElementById("items");
    if (!itemsDiv || !items.length) return;
    itemsDiv.innerHTML = "";
    items.forEach((item, index) => {
        let price = Number(item.price);
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

// Add item to cart
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

// Render cart
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
    calculateChange();
}

// Remove item from cart
function removeFromCart(index) {
    const item = cart[index];
    const product = items.find(i => i.name === item.name);
    if (product) product.stock++;
    cart.splice(index, 1);
    saveData();
    renderCart();
    renderItems();
}

// Edit stock manually
function editStock(index) {
    const newStock = prompt("Enter new stock amount:");
    if (newStock !== null && !isNaN(newStock)) {
        items[index].stock = parseInt(newStock, 10);
        saveData();
        renderItems();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("purchaseHistory", JSON.stringify(purchaseHistory));
}

// Handle checkout
function checkout() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    const total = parseFloat(document.getElementById("total").textContent);
    if (cashGiven < total) {
        alert("Insufficient cash given!");
        return;
    }
    const change = cashGiven - total;
    alert(`Thank you! Total: $${total.toFixed(2)}\nChange: $${change.toFixed(2)}`);

    let currentDate = new Date().toLocaleDateString();
    let record = purchaseHistory.find(r => r.date === currentDate);
    if (record) {
        record.itemsSold += cart.length;
        record.moneyMade += total;
    } else {
        purchaseHistory.push({ date: currentDate, itemsSold: cart.length, moneyMade: total });
    }

    updateStockInSheet();
    cart = [];
    cashGiven = 0;
    document.getElementById("cash-given").textContent = "0.00";
    document.getElementById("change-breakdown").textContent = "";
    saveData();
    renderCart();
    renderItems();
    renderHistory();
}

// Update stock in Google Sheet
function updateStockInSheet() {
    if (!accessToken) {
        console.error("Please sign in to update stock.");
        return;
    }
    const stockArray = items.map(item => item.stock);
    const requestBody = {
        range: "Finances!H2:H37",
        majorDimension: "COLUMNS",
        values: [stockArray]
    };

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Finances!H2:H37?valueInputOption=RAW`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    })
    .then(data => console.log("Stock updated successfully:", data))
    .catch(error => console.error("Error updating stock:", error));
}

// Handle cash selection
function selectCash(amount) {
    cashGiven += amount;
    document.getElementById("cash-given").textContent = cashGiven.toFixed(2);
    calculateChange();
}

// Calculate change
function calculateChange() {
    const total = parseFloat(document.getElementById("total").textContent);
    const change = cashGiven - total;
    document.getElementById("change-breakdown").textContent = change >= 0 ? change.toFixed(2) : "Not enough cash.";
}

// Render purchase history
function renderHistory() {
    let historyContainer = document.getElementById("history");
    historyContainer.innerHTML = "<h2>Purchase History</h2>";
    if (purchaseHistory.length === 0) {
        historyContainer.innerHTML += "<p>No purchases yet.</p>";
    } else {
        let table = `<table><thead><tr><th>Date</th><th>Items Sold</th><th>Money Made</th></tr></thead><tbody>`;
        purchaseHistory.forEach(record => {
            table += `<tr><td>${record.date}</td><td>${record.itemsSold}</td><td>$${record.moneyMade.toFixed(2)}</td></tr>`;
        });
        table += `</tbody></table>`;
        historyContainer.innerHTML += table;
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    renderHistory();
});