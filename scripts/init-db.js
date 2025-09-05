const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Create database and tables
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    console.log('Initializing database...');

    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created successfully');
        }
    });

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
    )`, (err) => {
        if (err) {
            console.error('Error creating tasks table:', err.message);
        } else {
            console.log('Tasks table created successfully');
        }
    });

    // Shared calendars table
    db.run(`CREATE TABLE IF NOT EXISTS shared_calendars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_email TEXT NOT NULL,
        message TEXT,
        shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users (id)
    )`, (err) => {
        if (err) {
            console.error('Error creating shared_calendars table:', err.message);
        } else {
            console.log('Shared calendars table created successfully');
        }
    });

    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@example.com', ?, 'admin')`, [adminPassword], function(err) {
        if (err) {
            console.error('Error creating admin user:', err.message);
        } else {
            if (this.changes > 0) {
                console.log('Default admin user created successfully');
                console.log('Username: admin');
                console.log('Password: admin123');
            } else {
                console.log('Admin user already exists');
            }
        }
        
        // Create sample data
        createSampleData();
    });
}

function createSampleData() {
    console.log('Creating sample data...');

    // Create sample users
    const sampleUsers = [
        { username: 'user1', email: 'user1@example.com', password: bcrypt.hashSync('password123', 10), role: 'user' },
        { username: 'user2', email: 'user2@example.com', password: bcrypt.hashSync('password123', 10), role: 'user' }
    ];

    sampleUsers.forEach((user, index) => {
        db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            [user.username, user.email, user.password, user.role], function(err) {
            if (err) {
                console.error(`Error creating user ${user.username}:`, err.message);
            } else {
                if (this.changes > 0) {
                    console.log(`Sample user ${user.username} created successfully`);
                }
            }
        });
    });

    // Create sample tasks
    const sampleTasks = [
        {
            title: 'Họp team dự án',
            description: 'Thảo luận về tiến độ dự án và kế hoạch tuần tới',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            priority: 'high',
            status: 'pending',
            user_id: 1
        },
        {
            title: 'Review code',
            description: 'Kiểm tra và đánh giá code của các thành viên trong team',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '14:00',
            priority: 'medium',
            status: 'pending',
            user_id: 1
        },
        {
            title: 'Làm báo cáo tuần',
            description: 'Tổng hợp và viết báo cáo công việc tuần này',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '16:00',
            priority: 'medium',
            status: 'pending',
            user_id: 1
        },
        {
            title: 'Training kỹ năng mới',
            description: 'Tham gia khóa học về công nghệ mới',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '10:00',
            priority: 'low',
            status: 'pending',
            user_id: 2
        }
    ];

    sampleTasks.forEach((task, index) => {
        db.run(`INSERT OR IGNORE INTO tasks (title, description, date, time, priority, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [task.title, task.description, task.date, task.time, task.priority, task.status, task.user_id], function(err) {
            if (err) {
                console.error(`Error creating task ${task.title}:`, err.message);
            } else {
                if (this.changes > 0) {
                    console.log(`Sample task "${task.title}" created successfully`);
                }
            }
        });
    });

    // Create sample shared calendar
    db.run(`INSERT OR IGNORE INTO shared_calendars (from_user_id, to_email, message) VALUES (?, ?, ?)`,
        [1, 'colleague@example.com', 'Chia sẻ lịch trình tuần này'], function(err) {
        if (err) {
            console.error('Error creating sample share:', err.message);
        } else {
            if (this.changes > 0) {
                console.log('Sample shared calendar created successfully');
            }
        }
        
        console.log('\nDatabase initialization completed!');
        console.log('\nSample accounts:');
        console.log('Admin: admin / admin123');
        console.log('User 1: user1 / password123');
        console.log('User 2: user2 / password123');
        
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Database connection closed.');
            process.exit(0);
        });
    });
}
