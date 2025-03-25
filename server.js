const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const CSV_FILE = path.join(__dirname, 'items.csv');

app.use(cors());
app.use(bodyParser.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Read items from items.csv
app.get('/api/items', (req, res) => {
  fs.readFile(CSV_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading items.csv');
    }
    const items = parseCSV(data);
    res.json(items);
  });
});

// Update items.csv after checkout
app.post('/api/update-stock', (req, res) => {
  const updatedItems = req.body;
  const csvData = convertToCSV(updatedItems);
  fs.writeFile(CSV_FILE, csvData, 'utf8', (err) => {
    if (err) {
      return res.status(500).send('Error updating items.csv');
    }
    res.send('Stock updated successfully');
  });
});

// Parse CSV to JSON
function parseCSV(data) {
  const rows = data.split('\n').slice(1);
  const items = rows
    .filter((row) => row.trim() !== '')
    .map((row) => {
      const [name, price, stock, category] = row.split(',');
      return {
        name: name.trim(),
        price: parseFloat(price.trim()),
        stock: parseInt(stock.trim()),
        category: category ? category.trim().toLowerCase() : 'default',
      };
    });
  return items;
}

// Convert JSON to CSV format
function convertToCSV(items) {
  const header = 'Name,Price,Stock,Category\n';
  const rows = items
    .map(
      (item) =>
        `${item.name},${item.price.toFixed(2)},${item.stock},${item.category}`
    )
    .join('\n');
  return header + rows;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
