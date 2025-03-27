const admin = require('firebase-admin');
const csv = require('csv-parser');
const fs = require('fs');

// Initialize Firebase Admin SDK with your service account
admin.initializeApp({
  credential: admin.credential.cert('canteen-tracker-firebase-adminsdk-fbsvc-1ad74ceab8.json'),
});

const db = admin.firestore();

// Path to your CSV file
const CSV_FILE_PATH = 'items.csv';

// Function to upload data from CSV to Firestore
function uploadCSVToFirestore() {
  const itemsRef = db.collection('items');
  const results = [];

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
      // Map CSV rows to Firestore documents
      results.push({
        name: row.Name,
        price: parseFloat(row.Price),
        stock: parseInt(row.Stock),
        category: row.Category || 'default',
      });
    })
    .on('end', async () => {
      console.log('CSV file successfully processed');

      // Upload data to Firestore
      for (const item of results) {
        try {
          // Use item name as Firestore document ID
          await itemsRef.doc(item.name).set(item);
          console.log(`Uploaded: ${item.name}`);
        } catch (error) {
          console.error(`Error uploading item: ${item.name}`, error);
        }
      }
    });
}

// Start the CSV upload process
uploadCSVToFirestore();
