document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reminder-form');
    const reminderTextInput = document.getElementById('reminder-text');
    const reminderDateInput = document.getElementById('reminder-date');
    const reminderTimeInput = document.getElementById('reminder-time');
    const reminderList = document.getElementById('reminder-list');
    const pinnedList = document.getElementById('pinned-list');
    const pinnedSection = document.getElementById('pinned-reminders-section');
    const alarmSound = document.getElementById('alarm-sound');

    let reminders = JSON.parse(localStorage.getItem('reminders')) || [];

    const saveReminders = () => {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    };

    const renderReminders = () => {
        reminderList.innerHTML = '';
        pinnedList.innerHTML = '';

        const now = new Date();
        reminders.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

        const pinnedReminders = reminders.filter(r => r.isPinned && !r.completed);
        const normalReminders = reminders.filter(r => !r.isPinned);

        if (pinnedReminders.length > 0) {
            pinnedSection.classList.remove('hidden');
            pinnedReminders.forEach(reminder => createReminderElement(reminder, pinnedList));
        } else {
            pinnedSection.classList.add('hidden');
        }

        if (normalReminders.length === 0 && pinnedReminders.length === 0) {
            reminderList.innerHTML = '<p style="text-align:center; opacity:0.7;">Nenhum lembrete ainda. Adicione um!</p>';
        } else {
            normalReminders.forEach(reminder => createReminderElement(reminder, reminderList));
        }
    };

    const createReminderElement = (reminder, listElement) => {
        const li = document.createElement('li');
        const reminderIndex = reminders.indexOf(reminder);
        li.className = `reminder-item ${reminder.completed ? 'completed' : ''}`;
        li.dataset.index = reminderIndex;

        const [year, month, day] = reminder.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        li.innerHTML = `
            <div class="reminder-content">
                <div class="text">${reminder.text}</div>
                <div class="datetime">
                    <span>${formattedDate}</span> às <span>${reminder.time}</span>
                </div>
            </div>
            <div class="reminder-actions">
                <button class="pin-btn" title="Fixar Lembrete">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="delete-btn" title="Excluir lembrete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // Marcar como concluído
        li.querySelector('.reminder-content').addEventListener('click', () => {
            reminders[reminderIndex].completed = !reminders[reminderIndex].completed;
            saveReminders();
            renderReminders();
        });

        // Fixar (Post-it)
        const pinBtn = li.querySelector('.pin-btn');
        if (reminder.isPinned) {
            pinBtn.classList.add('active');
        }
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            reminders[reminderIndex].isPinned = !reminders[reminderIndex].isPinned;
            saveReminders();
            renderReminders();
        });

        // Excluir
        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            reminders.splice(reminderIndex, 1);
            saveReminders();
            renderReminders();
        });

        listElement.appendChild(li);
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = reminderTextInput.value.trim();
        const date = reminderDateInput.value;
        const time = reminderTimeInput.value;

        if (!text || !date || !time) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        reminders.push({ text, date, time, completed: false, isPinned: false });
        saveReminders();
        renderReminders();
        form.reset();
        setDefaultDateTime();
        reminderTextInput.focus();
    });

    const checkAlarms = () => {
        const now = new Date();
        const currentTime = now.getFullYear() + '-' +
                            String(now.getMonth() + 1).padStart(2, '0') + '-' +
                            String(now.getDate()).padStart(2, '0') + 'T' +
                            String(now.getHours()).padStart(2, '0') + ':' +
                            String(now.getMinutes()).padStart(2, '0');

        reminders.forEach(reminder => {
            if (!reminder.completed && !reminder.alarmTriggered) {
                const reminderTime = `${reminder.date}T${reminder.time}`;
                if (currentTime === reminderTime) {
                    showNotification(reminder);
                    reminder.alarmTriggered = true; // Marca para não tocar novamente
                    saveReminders();
                }
            }
        });
    };

    const showNotification = (reminder) => {
        const notificationText = `Lembrete: ${reminder.text}`;
        
        // Toca o som do alarme
        alarmSound.play();

        // Usa a API de Notificações do Navegador
        if (Notification.permission === "granted") {
            new Notification("Hora do Lembrete!", {
                body: notificationText,
                icon: "https://img.icons8.com/plasticine/100/alarm-clock.png" // Um ícone genérico
            } );
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Hora do Lembrete!", { body: notificationText });
                }
            });
        }
        // Se a permissão for negada, o alerta servirá como fallback
        alert(notificationText);
    };

    const setDefaultDateTime = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        reminderDateInput.setAttribute('min', today);
        reminderDateInput.value = today;
        reminderTimeInput.value = currentTime;
    };

    // Pede permissão para notificações assim que a página carrega
    Notification.requestPermission();
    
    // Inicia o verificador de alarmes a cada 30 segundos
    setInterval(checkAlarms, 30000);

    setDefaultDateTime();
    renderReminders();
});
