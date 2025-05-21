require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middlewares
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Health check
app.get('/', (req, res) => res.json({ message: 'VoiceRead Library API is running' }));

// Create a book
app.post('/books', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO books (title, content) VALUES ($1, $2) RETURNING id',
      [title, content]
    );
    res.json({ success: true, message: 'Book added successfully', book_id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add book' });
  }
});

// Admin login
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing email or password' });
  }
  try {
    const result = await pool.query('SELECT * FROM admin WHERE email = $1', [email]);
    if (result.rows.length === 1) {
      const admin = result.rows[0];
      if (password === admin.password) {
        // Generate JWT if needed
        const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET);
        res.json({ success: true, message: 'Login successful', token });
      } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
      }
    } else {
      res.status(404).json({ success: false, message: 'Admin not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Get single book by ID
app.get('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid book id' });
  }
  try {
    const result = await pool.query('SELECT id, title, content FROM books WHERE id = $1 LIMIT 1', [id]);
    if (result.rows.length === 1) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json(null);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch book' });
  }
});

// Get all books
app.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, content FROM books ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch books' });
  }
});

// Delete a book
app.delete('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing ID' });
  }
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    res.json({ success: true, message: 'Book deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Update a book
app.put('/books', async (req, res) => {
    const { id, title, content } = req.body;

    // Validate input
    if (!id || !title || !content) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'UPDATE books SET title = $1, content = $2 WHERE id = $3',
            [title, content, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Invalid book id' });
        }

        res.json({ success: true, message: 'Book updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});


// Get book count
app.get('/books/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM books');
        const count = parseInt(result.rows[0].count, 10);
        res.json({ success: true, count });
    } catch (err) {
        console.error('Error fetching book count:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch book count' });
    }
});

app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));

