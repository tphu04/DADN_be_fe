// const bcrypt = require('bcryptjs'); // Không cần bcrypt nữa
const pool = require('../../config/database');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.password = userData.password;
    this.email = userData.email;
    this.phone = userData.phone;
    this.fullname = userData.fullname;
    this.address = userData.address || null;
    this.role = userData.role || 'USER';
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length) {
      return new User(rows[0]);
    }
    return null;
  }

  async save() {
    try {
        // Không còn mã hóa mật khẩu
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, email, phone, role, fullname, address) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [this.username, this.password, this.email, this.phone, this.role, this.fullname, this.address]
        );
        return result.insertId;
    } catch (error) {
        throw error;
    }
  }

  static async checkPassword(password, storedPassword) {
    // So sánh trực tiếp mật khẩu thay vì sử dụng bcrypt.compare
    return password === storedPassword;
  }
}

module.exports = User;