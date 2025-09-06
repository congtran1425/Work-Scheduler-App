const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        time TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Shared calendars table
    db.run(`CREATE TABLE IF NOT EXISTS shared_calendars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_email TEXT NOT NULL,
        message TEXT,
        shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users (id)
    )`);

    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@example.com', ?, 'admin')`, [adminPassword]);
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Email configuration (for sharing)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// API Routes

// Authentication routes
app.post('/api/auth/register', [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            const token = jwt.sign(
                { id: this.lastID, username, role: 'user' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'User registered successfully',
                token,
                user: { id: this.lastID, username, email, role: 'user' }
            });
        });
});

app.post('/api/auth/login', [
    body('username').trim().escape(),
    body('password').exists()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    });
});

// Tasks routes
app.get('/api/tasks', authenticateToken, (req, res) => {
    // All users (including admin) can only see their own tasks
    const query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.user.id];

    db.all(query, params, (err, tasks) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(tasks);
    });
});

app.post('/api/tasks', authenticateToken, [
    body('title').isLength({ min: 1 }).trim().escape(),
    body('date').isISO8601().toDate(),
    body('priority').isIn(['low', 'medium', 'high']),
    body('status').isIn(['pending', 'in-progress', 'completed'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, date, time, priority, status } = req.body;

    db.run('INSERT INTO tasks (title, description, date, time, priority, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description, date, time, priority, status, req.user.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.status(201).json({
                message: 'Task created successfully',
                task: { id: this.lastID, title, description, date, time, priority, status, user_id: req.user.id }
            });
        });
});

app.put('/api/tasks/:id', authenticateToken, [
    body('title').isLength({ min: 1 }).trim().escape(),
    body('date').isISO8601().toDate(),
    body('priority').isIn(['low', 'medium', 'high']),
    body('status').isIn(['pending', 'in-progress', 'completed'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.id;
    const { title, description, date, time, priority, status } = req.body;

    // Check if task exists and user has permission
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        db.run('UPDATE tasks SET title = ?, description = ?, date = ?, time = ?, priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, date, time, priority, status, taskId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    message: 'Task updated successfully',
                    task: { id: taskId, title, description, date, time, priority, status }
                });
            });
    });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
    const taskId = req.params.id;

    // Check if task exists and user has permission
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ message: 'Task deleted successfully' });
        });
    });
});

// Share routes
app.post('/api/share', authenticateToken, [
    body('email').isEmail().normalizeEmail(),
    body('message').optional().trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, message } = req.body;

    // Get user's tasks
    db.all('SELECT * FROM tasks WHERE user_id = ?', [req.user.id], (err, tasks) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Save share record
        db.run('INSERT INTO shared_calendars (from_user_id, to_email, message) VALUES (?, ?, ?)',
            [req.user.id, email, message], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                // Send email (optional)
                const mailOptions = {
                    from: process.env.EMAIL_USER || 'your-email@gmail.com',
                    to: email,
                    subject: `Lịch trình được chia sẻ từ ${req.user.username}`,
                    html: `
                        <h2>Lịch trình được chia sẻ</h2>
                        <p>Xin chào,</p>
                        <p>${req.user.username} đã chia sẻ lịch trình của họ với bạn.</p>
                        ${message ? `<p>Lời nhắn: ${message}</p>` : ''}
                        <p>Tổng số công việc: ${tasks.length}</p>
                        <p>Vui lòng truy cập ứng dụng để xem chi tiết.</p>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Email sending failed:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });

                res.json({
                    message: 'Calendar shared successfully',
                    shareId: this.lastID
                });
            });
    });
});

app.get('/api/shared', authenticateToken, (req, res) => {
    db.all('SELECT * FROM shared_calendars WHERE from_user_id = ?', [req.user.id], (err, shares) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(shares);
    });
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(users);
    });
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, [
    body('role').isIn(['user', 'admin'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
    }

    db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [role, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ message: 'User role updated successfully' });
        });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user's tasks first
    db.run('DELETE FROM tasks WHERE user_id = ?', [userId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Delete user's shared calendars
        db.run('DELETE FROM shared_calendars WHERE from_user_id = ?', [userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Delete the user
            db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                res.json({ message: 'User deleted successfully' });
            });
        });
    });
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    // Get user count
    db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.totalUsers = result.count;
        
        // Get task count
        db.get('SELECT COUNT(*) as count FROM tasks', (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            stats.totalTasks = result.count;
            
            // Get share count
            db.get('SELECT COUNT(*) as count FROM shared_calendars', (err, result) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                stats.totalShares = result.count;
                
                res.json(stats);
            });
        });
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the application`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
