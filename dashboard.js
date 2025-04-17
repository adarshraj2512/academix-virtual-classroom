// DOM elements
const userGreeting = document.getElementById('user-greeting');
const dateDisplay = document.getElementById('date-display');
const calendarDays = document.getElementById('calendar-days');
const currentMonthElement = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const upcomingClassesList = document.getElementById('upcoming-classes-list');
const classDetailsModal = document.getElementById('class-details-modal');
const closeModalBtn = document.querySelector('.close-modal');

// Calendar variables
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let classes = [];

// Initialize homepage
function initHomepage() {
    // Set user greeting
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        const displayName = userEmail.split('@')[0];
        userGreeting.textContent = displayName;

        // Format and display current date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
    }

    // Load classes from localStorage
    loadClasses();

    // Initialize calendar
    renderCalendar(currentMonth, currentYear);

    // Set up event listeners
    setupEventListeners();
}

// Load classes from localStorage
function loadClasses() {
    const storedClasses = localStorage.getItem('classes');
    if (storedClasses) {
        classes = JSON.parse(storedClasses).map(classItem => ({
            ...classItem,
            dateTime: new Date(classItem.dateTime)
        }));
    } else {
        classes = [];
    }

    // Update calendar and class lists
    renderCalendar(currentMonth, currentYear);
    renderClassLists();
}

// Save classes to localStorage
function saveClasses() {
    const classesToStore = classes.map(classItem => ({
        ...classItem,
        dateTime: classItem.dateTime.toISOString()
    }));
    localStorage.setItem('classes', JSON.stringify(classesToStore));
}

// Render calendar
function renderCalendar(month, year) {
    // Set current month display
    currentMonthElement.textContent = new Date(year, month).toLocaleDateString('default', {
        month: 'long',
        year: 'numeric'
    });

    // Get first day of month and total days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Clear previous calendar days
    calendarDays.innerHTML = '';

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        // Check if today
        const today = new Date();
        if (date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()) {
            dayElement.classList.add('today');
        }

        // Check if has classes
        const dayClasses = getClassesForDate(date);
        if (dayClasses.length > 0) {
            dayElement.classList.add('has-class');
            dayElement.style.backgroundColor = 'orange';  // Highlight with orange color
        }

        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // Add class indicators
        if (dayClasses.length > 0) {
            const classIndicators = document.createElement('div');
            classIndicators.className = 'calendar-day-classes';

            // Show first 2 class titles
            const titlesToShow = dayClasses.slice(0, 2).map(c => c.title);
            if (dayClasses.length > 2) {
                titlesToShow.push(`${dayClasses.length - 2} more`);
            }
            classIndicators.textContent = titlesToShow.join(', ');

            dayElement.appendChild(classIndicators);
        }

        // Add click event to show classes for this day
        dayElement.addEventListener('click', () => {
            if (dayClasses.length > 0) {
                showClassesForDate(date, dayClasses);
            }
        });

        calendarDays.appendChild(dayElement);
    }
}

// Get classes for a specific date
function getClassesForDate(date) {
    return classes.filter(classItem => {
        const classDate = classItem.dateTime;
        return classDate.getDate() === date.getDate() &&
            classDate.getMonth() === date.getMonth() &&
            classDate.getFullYear() === date.getFullYear();
    });
}

// Render upcoming class list
function renderClassLists() {
    const now = new Date();

    // Filter upcoming classes (including those happening now)
    const upcomingClasses = classes.filter(classItem => classItem.dateTime >= now);

    // Render upcoming classes
    upcomingClassesList.innerHTML = '';
    if (upcomingClasses.length === 0) {
        upcomingClassesList.innerHTML = '<div class="no-classes">No upcoming classes scheduled</div>';
    } else {
        upcomingClasses.slice(0, 3).forEach(classItem => {
            upcomingClassesList.appendChild(createClassCard(classItem));
        });
    }
}

// Create a class card element
function createClassCard(classItem) {
    const classCard = document.createElement('div');
    classCard.className = 'class-card upcoming';
    classCard.dataset.id = classItem.id; // Add data-id attribute

    const dateTime = new Date(classItem.dateTime);
    const timeString = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = dateTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    classCard.innerHTML = `
        <div class="class-card-header">
            <div class="class-card-title">${classItem.title}</div>
            <div class="class-card-time">${dateString} · ${timeString}</div>
        </div>
        <div class="class-card-instructor">Instructor: ${classItem.instructor}</div>
        <div class="class-card-actions">
            <button class="delete-class-btn" data-id="${classItem.id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    // Add delete button event listener
    const deleteBtn = classCard.querySelector('.delete-class-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            deleteClass(classItem.id);
        });
    }

    return classCard;
}

// Delete class function
function deleteClass(classId) {
    if (confirm('Are you sure you want to delete this class?')) {
        // Remove class from classes array
        classes = classes.filter(classItem => classItem.id !== classId);
        
        // Save updated classes to localStorage
        saveClasses();
        
        // Refresh calendar and class lists
        loadClasses();
    }
}

// Show class details in modal
function showClassDetails(classItem) {
    const modalTitle = document.getElementById('modal-class-title');
    const modalDate = document.getElementById('modal-class-date');
    const modalTime = document.getElementById('modal-class-time');
    const modalInstructor = document.getElementById('modal-class-instructor');
    const modalLink = document.getElementById('modal-class-link');
    const modalDescription = document.getElementById('modal-class-description');
    const joinClassBtn = document.getElementById('join-class-modal-btn');
    const viewMaterialsBtn = document.getElementById('view-materials-modal-btn');
    const deleteClassBtn = document.getElementById('delete-class-btn');

    // Set modal content
    modalTitle.textContent = classItem.title;
    modalDate.textContent = classItem.dateTime.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    modalTime.textContent = classItem.dateTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    modalInstructor.textContent = classItem.instructor;
    modalLink.href = `video.html?classId=${classItem.id}`;
    modalDescription.textContent = classItem.description || 'No description provided.';

    // Set up buttons
    const now = new Date();
    if (classItem.dateTime > now) {
        joinClassBtn.textContent = 'Join When Available';
        joinClassBtn.disabled = true;
    } else {
        joinClassBtn.textContent = 'Join Class';
        joinClassBtn.disabled = false;
        joinClassBtn.onclick = () => {
            window.location.href = `video.html?classId=${classItem.id}`;
        };
    }

    viewMaterialsBtn.onclick = () => {
        window.location.href = `documents.html?classId=${classItem.id}`;
    };

    // Set up delete button
    deleteClassBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this class?')) {
            // Remove class from classes array
            classes = classes.filter(c => c.id !== classItem.id);
            
            // Save updated classes to localStorage
            saveClasses();
            
            // Close modal
            classDetailsModal.style.display = 'none';
            
            // Refresh calendar and class lists
            renderCalendar(currentMonth, currentYear);
            renderClassLists();
        }
    };

    // Show modal
    classDetailsModal.style.display = 'block';
}

// Show classes for a specific date
function showClassesForDate(date, dayClasses) {
    // Create a modal or popup to display all classes for this date
    alert(`Classes on ${date.toLocaleDateString()}:\n\n${
        dayClasses.map(c => `• ${c.title} (${c.dateTime.toLocaleTimeString()})`).join('\n')
    }`);
}

// Show all upcoming classes in a modal
function showAllUpcomingClasses() {
    const now = new Date();
    const upcomingClasses = classes.filter(classItem => classItem.dateTime >= now);
    
    if (upcomingClasses.length === 0) {
        alert('No upcoming classes scheduled');
        return;
    }

    // Create modal content
    let modalContent = '<div class="all-classes-modal">';
    modalContent += '<h3>All Upcoming Classes</h3>';
    modalContent += '<div class="all-classes-list">';
    
    upcomingClasses.forEach(classItem => {
        const dateTime = new Date(classItem.dateTime);
        const timeString = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = dateTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        
        modalContent += `
            <div class="all-class-item" data-id="${classItem.id}">
                <div class="all-class-header">
                    <h4>${classItem.title}</h4>
                    <span class="all-class-time">${dateString} · ${timeString}</span>
                </div>
                <div class="all-class-instructor">Instructor: ${classItem.instructor}</div>
                <div class="all-class-actions">
                    <button class="btn btn-sm" onclick="showClassDetails(${JSON.stringify(classItem).replace(/"/g, '&quot;')})">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="btn btn-sm delete-class-btn" data-id="${classItem.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    modalContent += '</div></div>';

    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            ${modalContent}
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => {
        modal.remove();
    };

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    };

    // Add delete button event listeners
    const deleteButtons = modal.querySelectorAll('.delete-class-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = button.dataset.id;
            deleteClass(classId);
            modal.remove();
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Month navigation
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }

    // Schedule Class Button
    const scheduleClassBtn = document.getElementById('schedule-class-btn');
    const scheduleClassModal = document.getElementById('schedule-class-modal');
    const scheduleClassForm = document.getElementById('schedule-class-form');
    const cancelScheduleBtn = document.getElementById('cancel-schedule');

    if (scheduleClassBtn) {
        scheduleClassBtn.addEventListener('click', () => {
            if (scheduleClassModal) {
                scheduleClassModal.style.display = 'block';
            }
        });
    }

    // Close modal buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (scheduleClassModal) {
                scheduleClassModal.style.display = 'none';
            }
            if (classDetailsModal) {
                classDetailsModal.style.display = 'none';
            }
        });
    });

    // Cancel Schedule Button
    if (cancelScheduleBtn) {
        cancelScheduleBtn.addEventListener('click', () => {
            if (scheduleClassModal) {
                scheduleClassModal.style.display = 'none';
            }
        });
    }

    // Schedule Class Form
    if (scheduleClassForm) {
        scheduleClassForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('class-title').value;
            const date = document.getElementById('class-date').value;
            const time = document.getElementById('class-time').value;
            const duration = parseInt(document.getElementById('class-duration').value) || 60;
            const description = document.getElementById('class-description').value;

            if (!title || !date || !time) {
                alert('Please fill in all required fields');
                return;
            }

            // Create class object
            const newClass = {
                id: Date.now().toString(),
                title,
                dateTime: new Date(`${date}T${time}`),
                duration,
                description,
                instructor: localStorage.getItem('username') || 'Unknown Instructor'
            };

            // Add class to classes array
            classes.push(newClass);
            
            // Save to localStorage
            saveClasses();
            
            // Close modal and reset form
            if (scheduleClassModal) {
                scheduleClassModal.style.display = 'none';
            }
            scheduleClassForm.reset();
            
            // Refresh calendar and class lists
            loadClasses();
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (scheduleClassModal && event.target === scheduleClassModal) {
            scheduleClassModal.style.display = 'none';
        }
        if (classDetailsModal && event.target === classDetailsModal) {
            classDetailsModal.style.display = 'none';
        }
    });

    // View All Upcoming Classes Button
    const viewAllUpcomingBtn = document.getElementById('view-all-upcoming');
    if (viewAllUpcomingBtn) {
        viewAllUpcomingBtn.addEventListener('click', showAllUpcomingClasses);
    }
}

// Initialize the homepage
initHomepage();