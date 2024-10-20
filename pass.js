const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// MySQL connection settings
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Muri@835101',
  database: 'homestayDB',
  port: 3306
};

// Function to hash and update passwords
async function hashAndUpdatePasswords() {
  try {
    // Connect to the database
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database connected');

    // Fetch users with plain-text passwords
    const [users] = await connection.execute('SELECT id, username, password FROM users');

    // Loop through each user and hash their passwords
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10); // Hash the plain-text password

      // Update the user's password with the hashed version
      await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

      console.log(`Password for user ${user.username} has been hashed and updated.`);
    }

    console.log('All passwords have been successfully hashed.');
    
    // Close the connection
    await connection.end();
  } catch (error) {
    console.error('Error hashing and updating passwords:', error);
  }
}

// Call the function to start the process
hashAndUpdatePasswords();