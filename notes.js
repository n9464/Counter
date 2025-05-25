function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
// Your Firebase config and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCZdd01uYMq2b3pACHRgJQ7xtQJ6D2kGf8",
    authDomain: "canteen-tracker.firebaseapp.com",
    projectId: "canteen-tracker",
    storageBucket: "canteen-tracker.appspot.com",
    messagingSenderId: "628568313108",
    appId: "1:628568313108:web:ff300eb4aa53cf15908601",
    measurementId: "G-1NPKZBZMM6"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  
  const notesContainer = document.getElementById('notes-container');
  const addBtn = document.getElementById('add-note-btn');
  
  // Load and listen for notes changes
  function loadNotes() {
    db.collection('notes').onSnapshot(snapshot => {
      notesContainer.innerHTML = ''; // Clear current notes
  
      snapshot.forEach(doc => {
        const noteData = doc.data();
        createNoteElement(noteData.content, doc.id);
      });
    });
  }
  
  // Create a sticky note element and append it
  function createNoteElement(content = '', id = null) {
    const note = document.createElement('div');
    note.classList.add('note');
  
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.placeholder = "Type your note here...";
  
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';

    deleteBtn.title = 'Delete note';
  
    // Auto-resize function
    function autoResizeTextarea() {
        textarea.style.height = 'auto';               // reset height
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';  // cap at 300px
      }
      
  
    // Initial resize
    autoResizeTextarea();
  
    // Resize on input and save content to Firestore
    const debouncedUpdate = debounce((text) => {
        if (id) {
          db.collection('notes').doc(id).update({ content: text });
        }
      }, 1500);
      
      textarea.addEventListener('input', () => {
        autoResizeTextarea();
        debouncedUpdate(textarea.value);
      });
      
  
    // Delete note from Firestore
    deleteBtn.addEventListener('click', () => {
      if (id) db.collection('notes').doc(id).delete();
    });
  
    note.appendChild(textarea);
    note.appendChild(deleteBtn);
    notesContainer.appendChild(note);
  }
  
  // Add new empty note on button click
  addBtn.addEventListener('click', async () => {
    await db.collection('notes').add({ content: '' });
    // Do NOT createNoteElement here; onSnapshot handles it
  });
  
  // Initialize notes on page load
  document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
  });
  