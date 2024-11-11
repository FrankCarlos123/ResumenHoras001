const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
let currentWeekStart = new Date();
let selectedDate = null;

const holidays = {
    2024: [
        '2024-01-01', '2024-01-06', '2024-03-29', '2024-04-01',
        '2024-05-01', '2024-06-24', '2024-08-15', '2024-09-11',
        '2024-09-24', '2024-10-12', '2024-11-01', '2024-12-06',
        '2024-12-25', '2024-12-26'
    ]
};

function isHoliday(date) {
    const year = date.getFullYear();
    const dateString = date.toISOString().split('T')[0];
    return holidays[year]?.includes(dateString) || false;
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function calculateHours(startTime, endTime, breakStart, breakEnd) {
    let startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    let totalMinutes = endMinutes - startMinutes;

    if (breakStart && breakEnd) {
        let breakStartMinutes = timeToMinutes(breakStart);
        let breakEndMinutes = timeToMinutes(breakEnd);
        if (breakEndMinutes < breakStartMinutes) {
            breakEndMinutes += 24 * 60;
        }
        totalMinutes -= (breakEndMinutes - breakStartMinutes);
    }

    let dayHours = 0;
    let nightHours = 0;
    
    const dayStartMinutes = timeToMinutes('08:00');
    const dayEndMinutes = timeToMinutes('22:00');
    
    for (let minute = startMinutes; minute < startMinutes + totalMinutes; minute++) {
        let currentMinute = minute % (24 * 60);
        if (currentMinute >= dayStartMinutes && currentMinute < dayEndMinutes) {
            dayHours += 1/60;
        } else {
            nightHours += 1/60;
        }
    }

    return {
        dayHours: Math.round(dayHours * 10) / 10,
        nightHours: Math.round(nightHours * 10) / 10
    };
}

function getWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function formatDateRange(dates) {
    const start = dates[0];
    const end = dates[dates.length - 1];
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function updateShifts() {
    const dates = getWeekDates(currentWeekStart);
    document.getElementById('date-range').textContent = formatDateRange(dates);
    const container = document.getElementById('shifts-container');
    container.innerHTML = '';

    let totalDay = 0;
    let totalNight = 0;
    let totalHoliday = 0;
    let totalSunday = 0;

    dates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const stored = localStorage.getItem(dateKey);
        const shiftData = stored ? JSON.parse(stored) : null;
        const isSunday = date.getDay() === 0;
        const isHolidayDate = isHoliday(date);

        if (shiftData && !shiftData.freeDay) {
            const hours = calculateHours(shiftData.start, shiftData.end, shiftData.breakStart, shiftData.breakEnd);
            const totalHours = hours.dayHours + hours.nightHours;

            if (isSunday) {
                totalSunday += totalHours;
            } else if (isHolidayDate) {
                totalHoliday += totalHours;
            } else {
                totalDay += hours.dayHours;
                totalNight += hours.nightHours;
            }
        }

        const shift = document.createElement('div');
        shift.className = 'shift-card';
        shift.onclick = () => openModal(date);
        shift.innerHTML = `
            <div class="date-box ${(isSunday || isHolidayDate) ? 'weekend' : ''}">
                <div>${date.getDate()}</div>
                <div>${daysOfWeek[date.getDay()]}</div>
            </div>
            <div class="shift-details">
                ${shiftData?.freeDay ? 
                    'Free Day' : 
                    shiftData ? 
                        `${shiftData.start} - ${shiftData.end}
                         ${shiftData.breakStart ? `<br>Break: ${shiftData.breakStart} - ${shiftData.breakEnd}` : ''}` : 
                        'No shift'}
            </div>
        `;
        container.appendChild(shift);
    });

    displayTotals(totalDay, totalNight, totalHoliday, totalSunday);
}

function displayTotals(totalDay, totalNight, totalHoliday, totalSunday) {
    const rates = {
        day: parseFloat(localStorage.getItem('rate-day') || '10'),
        night: parseFloat(localStorage.getItem('rate-night') || '15'),
        holiday: parseFloat(localStorage.getItem('rate-holiday') || '20'),
        sunday: parseFloat(localStorage.getItem('rate-sunday') || '20')
    };

    const totalsHtml = `
        <div class="totals-card">
            <div class="totals-row">
                <span>Day Hours:</span>
                <span>${totalDay.toFixed(1)}h</span>
                <input type="number" class="rate-input" value="${rates.day}" 
                    onchange="updateRate('day', this.value)" step="0.5">
                <span>€${(totalDay * rates.day).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span>Night Hours:</span>
                <span>${totalNight.toFixed(1)}h</span>
                <input type="number" class="rate-input" value="${rates.night}" 
                    onchange="updateRate('night', this.value)" step="0.5">
                <span>€${(totalNight * rates.night).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span>Holiday Hours:</span>
                <span>${totalHoliday.toFixed(1)}h</span>
                <input type="number" class="rate-input" value="${rates.holiday}" 
                    onchange="updateRate('holiday', this.value)" step="0.5">
                <span>€${(totalHoliday * rates.holiday).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <span>Sunday Hours:</span>
                <span>${totalSunday.toFixed(1)}h</span>
                <input type="number" class="rate-input" value="${rates.sunday}" 
                    onchange="updateRate('sunday', this.value)" step="0.5">
                <span>€${(totalSunday * rates.sunday).toFixed(2)}</span>
            </div>
            <div class="totals-row">
                <strong>Total:</strong>
                <span>${(totalDay + totalNight + totalHoliday + totalSunday).toFixed(1)}h</span>
                <span></span>
                <strong>€${(
                    totalDay * rates.day +
                    totalNight * rates.night +
                    totalHoliday * rates.holiday +
                    totalSunday * rates.sunday
                ).toFixed(2)}</strong>
            </div>
        </div>
    `;
    
    document.getElementById('totals-container').innerHTML = totalsHtml;
}

function updateRate(type, value) {
    localStorage.setItem(`rate-${type}`, value);
    updateShifts();
}

function openModal(date) {
    selectedDate = date;
    const modal = document.getElementById('shift-modal');
    const stored = localStorage.getItem(date.toISOString().split('T')[0]);
    const shiftData = stored ? JSON.parse(stored) : null;

    document.getElementById('start-time').value = shiftData?.start || '';
    document.getElementById('end-time').value = shiftData?.end || '';
    document.getElementById('break-start').value = shiftData?.breakStart || '';
    document.getElementById('break-end').value = shiftData?.breakEnd || '';
    document.getElementById('free-day-toggle').checked = shiftData?.freeDay || false;

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('shift-modal').style.display = 'none';
}

function saveShift() {
    if (selectedDate) {
        const shiftData = {
            start: document.getElementById('start-time').value,
            end: document.getElementById('end-time').value,
            breakStart: document.getElementById('break-start').value,
            breakEnd: document.getElementById('break-end').value,
            freeDay: document.getElementById('free-day-toggle').checked
        };

        localStorage.setItem(
            selectedDate.toISOString().split('T')[0],
            JSON.stringify(shiftData)
        );

        closeModal();
        updateShifts();
    }
}

function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateShifts();
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateShifts();
}

function initializeSelectors() {
    const currentYear = new Date().getFullYear();
    const monthSelect = document.getElementById('monthSelect');
    const yearSelectMonth = document.getElementById('yearSelectMonth');
    const yearSelect = document.getElementById('yearSelect');
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    monthSelect.innerHTML = months.map((month, index) => 
        `<option value="${index + 1}">${month}</option>`
    ).join('');
    
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
        .map(year => `<option value="${year}">${year}</option>`)
        .join('');
    
    yearSelectMonth.innerHTML = yearOptions;
    yearSelect.innerHTML = yearOptions;
    
    monthSelect.value = new Date().getMonth() + 1;
    yearSelectMonth.value = currentYear;
    yearSelect.value = currentYear;
}

function toggleMonthSelector() {
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');
    yearSelector.classList.remove('active');
    monthSelector.classList.toggle('active');
}

function toggleYearSelector() {
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');
    monthSelector.classList.remove('active');
    yearSelector.classList.toggle('active');
}

function getMonthlyReport() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelectMonth').value);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let totalDay = 0;
    let totalNight = 0;
    let totalHoliday = 0;
    let totalSunday = 0;

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const stored = localStorage.getItem(date.toISOString().split('T')[0]);
        if (stored) {
            const shiftData = JSON.parse(stored);
            if (!shiftData.freeDay && shiftData.start && shiftData.end) {
                const hours = calculateHours(shiftData.start, shiftData.end, shiftData.breakStart, shiftData.breakEnd);
                if (date.getDay() === 0) {
                    totalSunday += hours.dayHours + hours.nightHours;
                } else if (isHoliday(date)) {
                    totalHoliday += hours.dayHours + hours.nightHours;
                } else {
                    totalDay += hours.dayHours;
                    totalNight += hours.nightHours;
                }
            }
        }
    }

    displayTotals(totalDay, totalNight, totalHoliday, totalSunday);
    document.getElementById('monthSelector').classList.remove('active');
}

function getYearlyReport() {
    const year = parseInt(document.getElementById('yearSelect').value);
    
    let totalDay = 0;
    let totalNight = 0;
    let totalHoliday = 0;
    let totalSunday = 0;

    for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const stored = localStorage.getItem(date.toISOString().split('T')[0]);
            if (stored) {
                const shiftData = JSON.parse(stored);
                if (!shiftData.freeDay && shiftData.start && shiftData.end) {
                    const hours = calculateHours(shiftData.start, shiftData.end, shiftData.breakStart, shiftData.breakEnd);
                    if (date.getDay() === 0) {
                        totalSunday += hours.dayHours + hours.nightHours;
                    } else if (isHoliday(date)) {
                        totalHoliday += hours.dayHours + hours.nightHours;
                    } else {
                        totalDay += hours.dayHours;
                        totalNight += hours.nightHours;
                    }
                }
            }
        }
    }

    displayTotals(totalDay, totalNight, totalHoliday, totalSunday);
    document.getElementById('yearSelector').classList.remove('active');
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeSelectors();
    updateShifts();
});