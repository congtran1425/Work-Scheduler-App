// Work Scheduler Application
class WorkScheduler {
    constructor() {
        this.currentUser = null;
        this.currentDate = new Date();
        this.tasks = [];
        this.sharedCalendars = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.authToken = localStorage.getItem('authToken');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderCalendar();
        this.checkAuthStatus();
    }

    // API Helper Methods
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    // Authentication Methods
    checkAuthStatus() {
        const savedUser = localStorage.getItem('currentUser');
        const savedToken = localStorage.getItem('authToken');
        
        if (savedUser && savedToken) {
            this.currentUser = JSON.parse(savedUser);
            this.authToken = savedToken;
            this.updateUIForLoggedInUser();
            this.loadTasks();
        }
    }

    updateUIForLoggedInUser() {
        document.getElementById('userName').textContent = this.currentUser.username;
        document.getElementById('userRole').textContent = this.currentUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
    }

    async login(username, password) {
        try {
            const response = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.currentUser = response.user;
            this.authToken = response.token;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('authToken', this.authToken);
            
            this.updateUIForLoggedInUser();
            this.closeModal('loginModal');
            this.showNotification('Đăng nhập thành công!', 'success');
            await this.loadTasks();
            return true;
        } catch (error) {
            return false;
        }
    }

    async register(username, email, password) {
        try {
            const response = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });

            this.showNotification('Đăng ký thành công!', 'success');
            this.closeModal('registerModal');
            this.showModal('loginModal');
            return true;
        } catch (error) {
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.authToken = null;
        this.tasks = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        this.renderCalendar();
        this.showNotification('Đã đăng xuất!', 'info');
    }

    // Calendar Methods
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const currentMonth = document.getElementById('currentMonth');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        currentMonth.textContent = this.getMonthName(month) + ' ' + year;
        
        // Clear calendar
        calendar.innerHTML = '';
        
        // Add header
        const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        daysOfWeek.forEach(day => {
            const headerCell = document.createElement('div');
            headerCell.className = 'calendar-header-cell';
            headerCell.textContent = day;
            calendar.appendChild(headerCell);
        });
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Add empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day other-month';
            calendar.appendChild(emptyCell);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.dataset.day = day;
            dayCell.dataset.month = month;
            dayCell.dataset.year = year;
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);
            
            // Check if today
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayCell.classList.add('today');
            }
            
            // Check if has tasks
            const dayTasks = this.getTasksForDate(year, month, day);
            if (dayTasks.length > 0) {
                dayCell.classList.add('has-tasks');
                
                const tasksPreview = document.createElement('div');
                tasksPreview.className = 'day-tasks-preview';
                tasksPreview.textContent = `${dayTasks.length} công việc`;
                dayCell.appendChild(tasksPreview);
            }
            
            // Add click event
            dayCell.addEventListener('click', () => this.showDayTasks(year, month, day));
            
            calendar.appendChild(dayCell);
        }
    }

    getMonthName(month) {
        const months = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        return months[month];
    }

    navigateMonth(direction) {
        if (direction === 'prev') {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        }
        this.renderCalendar();
    }

    // Task Methods
    getTasksForDate(year, month, day) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return this.tasks.filter(task => task.date === dateStr);
    }

    showDayTasks(year, month, day) {
        const tasks = this.getTasksForDate(year, month, day);
        const dateStr = `${day}/${month + 1}/${year}`;
        
        document.getElementById('dayTasksTitle').textContent = `Công việc ngày ${dateStr}`;
        
        const tasksList = document.getElementById('dayTasksList');
        tasksList.innerHTML = '';
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<p class="text-center">Không có công việc nào trong ngày này.</p>';
        } else {
            tasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                tasksList.appendChild(taskElement);
            });
        }
        
        // Set the date for adding new task
        document.getElementById('addTaskForDay').dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        this.showModal('dayTasksModal');
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'day-task-item';
        taskDiv.innerHTML = `
            <div class="day-task-info">
                <div class="day-task-title">${task.title}</div>
                <div class="day-task-time">${task.time || 'Cả ngày'}</div>
            </div>
            <div class="day-task-actions">
                <button class="btn btn-outline" onclick="app.editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="app.deleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        return taskDiv;
    }

    async addTask(taskData) {
        try {
            const response = await this.apiRequest('/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });

            await this.loadTasks();
            this.renderCalendar();
            this.renderTasksList();
            this.showNotification('Thêm công việc thành công!', 'success');
        } catch (error) {
            // Error already handled in apiRequest
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Check permissions
        if (this.currentUser && this.currentUser.role !== 'admin' && task.userId !== this.currentUser.id) {
            this.showNotification('Bạn không có quyền chỉnh sửa công việc này!', 'error');
            return;
        }
        
        document.getElementById('taskModalTitle').textContent = 'Chỉnh sửa công việc';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDate').value = task.date;
        document.getElementById('taskTime').value = task.time || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
        
        this.closeModal('dayTasksModal');
        this.showModal('taskModal');
    }

    async updateTask(taskId, taskData) {
        try {
            const response = await this.apiRequest(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });

            await this.loadTasks();
            this.renderCalendar();
            this.renderTasksList();
            this.showNotification('Cập nhật công việc thành công!', 'success');
        } catch (error) {
            // Error already handled in apiRequest
        }
    }

    async deleteTask(taskId) {
        if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
            try {
                await this.apiRequest(`/tasks/${taskId}`, {
                    method: 'DELETE'
                });

                await this.loadTasks();
                this.renderCalendar();
                this.renderTasksList();
                this.showNotification('Xóa công việc thành công!', 'success');
            } catch (error) {
                // Error already handled in apiRequest
            }
        }
    }

    renderTasksList() {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;
        
        tasksList.innerHTML = '';
        
        if (this.tasks.length === 0) {
            tasksList.innerHTML = '<p class="text-center">Chưa có công việc nào.</p>';
            return;
        }
        
        // Sort by date and time
        const sortedTasks = [...this.tasks].sort((a, b) => {
            const dateCompare = new Date(a.date) - new Date(b.date);
            if (dateCompare !== 0) return dateCompare;
            return (a.time || '00:00').localeCompare(b.time || '00:00');
        });
        
        sortedTasks.forEach(task => {
            const taskElement = this.createFullTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    createFullTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        
        const priorityClass = `priority-${task.priority}`;
        const statusClass = `status-${task.status}`;
        
        taskDiv.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(task.date)}</span>
                        ${task.time ? `<span><i class="fas fa-clock"></i> ${task.time}</span>` : ''}
                        <span class="priority-badge ${priorityClass}">${this.getPriorityText(task.priority)}</span>
                        <span class="status-badge ${statusClass}">${this.getStatusText(task.status)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-outline" onclick="app.editTask(${task.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        `;
        
        return taskDiv;
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'Thấp',
            'medium': 'Trung bình',
            'high': 'Cao'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            'pending': 'Chờ thực hiện',
            'in-progress': 'Đang thực hiện',
            'completed': 'Hoàn thành'
        };
        return statuses[status] || status;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN');
    }

    // Share Methods
    async shareCalendar(email, message) {
        if (!this.currentUser) {
            this.showNotification('Vui lòng đăng nhập để chia sẻ!', 'error');
            return;
        }
        
        try {
            const response = await this.apiRequest('/share', {
                method: 'POST',
                body: JSON.stringify({ email, message })
            });

            this.showNotification('Chia sẻ lịch trình thành công!', 'success');
            await this.loadSharedCalendars();
            this.renderSharedCalendars();
        } catch (error) {
            // Error already handled in apiRequest
        }
    }

    renderSharedCalendars() {
        const sharedList = document.getElementById('sharedList');
        if (!sharedList) return;
        
        sharedList.innerHTML = '';
        
        if (this.sharedCalendars.length === 0) {
            sharedList.innerHTML = '<p class="text-center">Chưa có lịch trình nào được chia sẻ.</p>';
            return;
        }
        
        this.sharedCalendars.forEach(share => {
            const shareElement = document.createElement('div');
            shareElement.className = 'shared-item';
            shareElement.innerHTML = `
                <div class="shared-info">
                    <div class="shared-name">Chia sẻ với: ${share.to_email}</div>
                    <div class="shared-date">${this.formatDate(share.shared_at)}</div>
                </div>
                <button class="btn btn-outline" onclick="app.viewSharedCalendar(${share.id})">
                    <i class="fas fa-eye"></i>
                </button>
            `;
            sharedList.appendChild(shareElement);
        });
    }

    // Modal Methods
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Notification Methods
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    // Page Navigation
    async showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(pageId).classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`).classList.add('active');
        
        // Load page content
        if (pageId === 'tasksPage') {
            await this.loadTasks();
            this.renderTasksList();
        } else if (pageId === 'sharePage') {
            await this.loadSharedCalendars();
            this.renderSharedCalendars();
        }
    }

    // Data Loading Methods
    async loadTasks() {
        if (!this.currentUser) {
            this.tasks = [];
            return;
        }

        try {
            const response = await this.apiRequest('/tasks');
            this.tasks = response;
        } catch (error) {
            this.tasks = [];
        }
    }

    async loadSharedCalendars() {
        if (!this.currentUser) {
            this.sharedCalendars = [];
            return;
        }

        try {
            const response = await this.apiRequest('/shared');
            this.sharedCalendars = response;
        } catch (error) {
            this.sharedCalendars = [];
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = link.dataset.page + 'Page';
                await this.showPage(page);
            });
        });

        // Login/Register
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showModal('loginModal');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('closeLoginModal').addEventListener('click', () => {
            this.closeModal('loginModal');
        });

        document.getElementById('closeRegisterModal').addEventListener('click', () => {
            this.closeModal('registerModal');
        });

        document.getElementById('showRegisterModal').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('loginModal');
            this.showModal('registerModal');
        });

        document.getElementById('showLoginModal').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('registerModal');
            this.showModal('loginModal');
        });

        // Login Form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const success = await this.login(username, password);
            if (success) {
                document.getElementById('loginForm').reset();
            }
        });

        // Register Form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                this.showNotification('Mật khẩu xác nhận không khớp!', 'error');
                return;
            }
            
            const success = await this.register(username, email, password);
            if (success) {
                document.getElementById('registerForm').reset();
            }
        });

        // Calendar Navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.navigateMonth('prev');
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.navigateMonth('next');
        });

        // Task Management
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showNotification('Vui lòng đăng nhập để thêm công việc!', 'error');
                return;
            }
            
            document.getElementById('taskModalTitle').textContent = 'Thêm công việc';
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = '';
            this.showModal('taskModal');
        });

        document.getElementById('addTaskForDay').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showNotification('Vui lòng đăng nhập để thêm công việc!', 'error');
                return;
            }
            
            const date = document.getElementById('addTaskForDay').dataset.date;
            document.getElementById('taskModalTitle').textContent = 'Thêm công việc';
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = '';
            document.getElementById('taskDate').value = date;
            this.closeModal('dayTasksModal');
            this.showModal('taskModal');
        });

        document.getElementById('closeTaskModal').addEventListener('click', () => {
            this.closeModal('taskModal');
        });

        document.getElementById('closeDayTasksModal').addEventListener('click', () => {
            this.closeModal('dayTasksModal');
        });

        document.getElementById('cancelTask').addEventListener('click', () => {
            this.closeModal('taskModal');
        });

        // Task Form
        document.getElementById('taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const taskId = document.getElementById('taskId').value;
            const taskData = {
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDescription').value,
                date: document.getElementById('taskDate').value,
                time: document.getElementById('taskTime').value,
                priority: document.getElementById('taskPriority').value,
                status: document.getElementById('taskStatus').value
            };
            
            if (taskId) {
                await this.updateTask(parseInt(taskId), taskData);
            } else {
                await this.addTask(taskData);
            }
            
            this.closeModal('taskModal');
        });

        // Share Form
        document.getElementById('shareBtn').addEventListener('click', async () => {
            const email = document.getElementById('shareEmail').value;
            const message = document.getElementById('shareMessage').value;
            
            if (!email) {
                this.showNotification('Vui lòng nhập email người nhận!', 'error');
                return;
            }
            
            await this.shareCalendar(email, message);
            document.getElementById('shareEmail').value = '';
            document.getElementById('shareMessage').value = '';
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
}

// Initialize the application
const app = new WorkScheduler();

// Add CSS for notifications
const notificationStyles = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
