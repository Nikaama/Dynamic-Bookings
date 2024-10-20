const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

// Create an express app
const app = express();
const port = 3000; // Adjust this port if needed

// Middleware
app.use(bodyParser.json()); // To parse JSON bodies

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',         // Your MySQL host
    user: 'root',              // Your MySQL username
    password: 'Muri@835101',      // Your MySQL password
    database: 'homestayDB',    // Your database name
    waitForConnections: true,
    connectionLimit: 10,       // Adjust based on expected traffic
    queueLimit: 0,
});

const db = pool.promise();

// Route to get all bookings from the booking table
app.get('/get-bookings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT booking_id, status FROM booking');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('Server error while fetching bookings');
    }
});

// Route to get all entries from the checkedin table
app.get('/get-checkedin', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT booking_id FROM checkedin');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching checked-in entries:', error);
        res.status(500).send('Server error while fetching checked-in data');
    }
});

// Route to update the booking status to 'checked_in'
app.post('/update-booking-status', async (req, res) => {
    const { booking_id, status } = req.body;

    if (!booking_id || !status) {
        return res.status(400).send('Invalid request, booking_id and status are required');
    }

    try {
        const [result] = await db.query('UPDATE booking SET status = ? WHERE booking_id = ?', [status, booking_id]);

        if (result.affectedRows === 0) {
            return res.status(404).send('Booking not found');
        }

        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        console.error(`Error updating status for booking_id ${booking_id}:`, error);
        res.status(500).send('Server error while updating booking status');
    }
});

// Helper function to compare booking and checkedin tables
async function compareAndUpdateBookingStatus() {
    try {
        const [bookings] = await db.query('SELECT booking_id, status FROM booking');
        const [checkedin] = await db.query('SELECT booking_id FROM checkedin');

        // Convert checkedin to a set for fast lookup
        const checkedInSet = new Set(checkedin.map(item => item.booking_id));

        // Loop through bookings to update status
        for (let booking of bookings) {
            if (checkedInSet.has(booking.booking_id) && booking.status !== 'checked_in') {
                console.log(`Updating status for booking_id ${booking.booking_id} to 'checked_in'`);
                
                // Update the booking status
                await db.query('UPDATE booking SET status = ? WHERE booking_id = ?', ['checked_in', booking.booking_id]);
            }
        }
    } catch (error) {
        console.error('Error comparing and updating booking statuses:', error);
    }
}

// Automatically refresh and check every 5 seconds
setInterval(() => {
    compareAndUpdateBookingStatus();
}, 5000); // 5000 ms = 5 seconds

// Error handling middleware for unhandled errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('An unexpected server error occurred');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});