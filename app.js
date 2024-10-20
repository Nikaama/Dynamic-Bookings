const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3020;

// MySQL connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Muri@835101',
    database: 'homestayDB',
    port: 3306,
};

// Middleware Setup
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'your_secret_key', // Use a secure key in production
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production with HTTPS
}));

// MySQL Connection Initialization
let db;
mysql.createConnection(dbConfig)
    .then(connection => {
        db = connection;
        console.log('Database connected successfully');
    })
    .catch(err => console.error('Failed to connect to the database:', err));

// Serve the login page
app.get('/', (req, res) => {
    console.log('Serving login page');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        res.json({ message: 'Login successful', userId: user.id });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Login failed due to server error' });
    }
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    next();
};

// Serve Booking Dashboard (authenticated users only)
app.get('/user/bookings', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking-dashboard.html'));
});

// Fetch Bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const [bookings] = await db.execute('SELECT *, DATEDIFF(checkout_date, checkin_date) AS day_count FROM booking');
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Error fetching bookings' });
    }
});

// Update Booking Status
app.put('/api/bookings/:id/status', async (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
        // Check current status before allowing update
        const [currentStatusRows] = await db.execute('SELECT status FROM booking WHERE booking_id = ?', [bookingId]);
        if (currentStatusRows.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        const currentStatus = currentStatusRows[0].status;
        if (currentStatus === 'checked_in') {
            return res.status(403).json({ message: 'Cannot change status of checked-in booking' });
        }

        const [result] = await db.execute('UPDATE booking SET status = ? WHERE booking_id = ?', [status, bookingId]);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Status updated successfully' });
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Fetch Rejected Bookings
app.get('/api/bookings/rejected', async (req, res) => {
    try {
        const [bookings] = await db.execute('SELECT * FROM booking WHERE status = ?', ['rejected']);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching rejected bookings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Fetch confirmed Bookings
app.get('/api/bookings/confirmed', async (req, res) => {
    try {
        const [results] = await db.execute('SELECT * FROM booking WHERE status = ?', ['confirmed']);
        res.json(results);
    } catch (error) {
        console.error('Error fetching confirmed bookings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Handle Check-in Submission
app.post('/checkin', async (req, res) => {
    const {
        booking_id,
        full_name,
        email,
        contact_number,
        checkedin_date,
        checkout_date,
        room_type,
        status = 'checked_in', // Set default status to 'checked_in'
        staff_id
    } = req.body;

    const query = `
      INSERT INTO checkedin 
      (booking_id, full_name, email, contact_number, checkedin_date, checkout_date, room_type, status, staff_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.execute(query, [
            booking_id, full_name, email, contact_number, 
            checkedin_date, checkout_date, room_type, status, staff_id
        ]);
        
        // Update original booking status to 'checked_in'
        await db.execute('UPDATE booking SET status = ? WHERE booking_id = ?', ['checked_in', booking_id]);
        
        res.json({ message: 'Check-in successful' });
    } catch (err) {
        console.error('Check-in data submission failed:', err);
        res.status(500).json({ error: 'Check-in data submission failed' });
    }
});

// Fetch Confirmed Booking by ID for Check-in
app.get('/booking/:booking_id', async (req, res) => {
    const bookingId = req.params.booking_id;
    const query = 'SELECT * FROM booking WHERE booking_id = ? AND status = ?';
  
    try {
        const [results] = await db.execute(query, [bookingId, 'confirmed']);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Confirmed booking not found' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});