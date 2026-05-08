import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// SweatSmart Config
const firebaseConfig = {
    apiKey: "AIzaSyCf1h7MkWXp4xoaX4inBHcFjSqphV3CNlo",
    authDomain: "sweatsmart-4feed.firebaseapp.com",
    projectId: "sweatsmart-4feed",
    storageBucket: "sweatsmart-4feed.firebasestorage.app",
    messagingSenderId: "736957038232",
    appId: "1:736957038232:web:d538ade380cd3251085aed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Database of Exercises with YouTube Embed IDs
const EXERCISE_DB = [
    { id: 'bb_bench', name: 'Barbell Bench Press', muscle: 'Chest', yt: 'tuwHzzPdaGc' },
    { id: 'db_incline', name: 'Incline Dumbbell Press', muscle: 'Chest', yt: '8iPEnn-ltC8' },
    { id: 'db_fly', name: 'Dumbbell Fly', muscle: 'Chest', yt: 'eozdVDA78K0' },
    { id: 'bb_squat', name: 'Barbell Squat', muscle: 'Legs', yt: 'bEv6CCg2BC8' },
    { id: 'romanian_dl', name: 'Romanian Deadlift', muscle: 'Legs', yt: 'JCXUYuzwNrM' },
    { id: 'pullup', name: 'Pull-Up', muscle: 'Back', yt: 'eGo4IYPNBGQ' },
    { id: 'lat_pulldown', name: 'Lat Pulldown', muscle: 'Back', yt: 'CAwf7n6Luuc' },
    { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders', yt: 'QAQ64Bqtecg' },
    { id: 'lateral_raise', name: 'Lateral Raise', muscle: 'Shoulders', yt: '3VcKaXpzqRo' },
    { id: 'bb_curl', name: 'Barbell Curl', muscle: 'Biceps', yt: 'kwG2ipFRgHA' },
    { id: 'hammer_curl', name: 'Hammer Curl', muscle: 'Biceps', yt: 'zC3nLlEvin4' },
    { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscle: 'Triceps', yt: '2-LAMcpzODU' },
    { id: 'skull_crusher', name: 'Skull Crusher', muscle: 'Triceps', yt: 'd_KZxkY_0cM' },
    { id: 'crunch', name: 'Crunch', muscle: 'Core', yt: 'Xyd_fa5zoEU' },
    { id: 'plank', name: 'Plank', muscle: 'Core', yt: 'pSHjTRCQxIw' }
];

// Global State
let currentUser = null;
let weeklyRoutine = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
let todayExercises = [];
let selectedExerciseForModal = null;

// DOM Elements
const mainContent = document.querySelector('.app-content');
const authScreen = document.getElementById('auth-screen');
const bottomNav = document.querySelector('.bottom-nav');

// --- 1. Authentication ---
document.getElementById('google-login-btn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authScreen.style.display = 'none';
        mainContent.style.display = 'block';
        bottomNav.style.display = 'flex';
        
        await loadProfile();
        await loadWeeklyRoutine();
        await loadCalendarLogs();
        renderExerciseLibrary(EXERCISE_DB);
        setupTodaySession();
    } else {
        currentUser = null;
        authScreen.style.display = 'flex';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
    }
});

// --- 2. Navigation ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item, .screen').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(item.getAttribute('data-target')).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// --- 3. Profile & BMI ---
async function loadProfile() {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
        const data = snap.data();
        if (data.weight) document.getElementById('weight-input').value = data.weight;
        if (data.height) document.getElementById('height-input').value = data.height;
        updateBMI(data.weight, data.height);
    }
}

function updateBMI(w, h) {
    if (w && h) {
        const bmi = (w / ((h/100) * (h/100))).toFixed(1);
        document.getElementById('bmi-display').textContent = bmi;
    }
}

document.getElementById('save-metrics-btn').addEventListener('click', async () => {
    const w = Number(document.getElementById('weight-input').value);
    const h = Number(document.getElementById('height-input').value);
    await setDoc(doc(db, "users", currentUser.uid), { weight: w, height: h }, { merge: true });
    updateBMI(w, h);
    alert("Metrics updated!");
});

// --- 4. Library & Modal Logic ---
function renderExerciseLibrary(exercises) {
    const list = document.getElementById('exercise-list');
    list.innerHTML = '';
    exercises.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.innerHTML = `<div><strong>${ex.name}</strong><br><span style="font-size:12px; color:var(--text-muted);">${ex.muscle}</span></div><button class="action-btn">Add</button>`;
        item.querySelector('.action-btn').addEventListener('click', () => {
            selectedExerciseForModal = ex;
            document.getElementById('modal-title').textContent = ex.name;
            document.getElementById('global-modal').style.display = 'flex';
        });
        list.appendChild(item);
    });
}

document.getElementById('exercise-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderExerciseLibrary(EXERCISE_DB.filter(ex => ex.name.toLowerCase().includes(term) || ex.muscle.toLowerCase().includes(term)));
});

// Close Modal
document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('global-modal').style.display = 'none';
});

// --- 5. Weekly Planner Logic ---
async function loadWeeklyRoutine() {
    const snap = await getDoc(doc(db, "users", currentUser.uid, "planner", "weekly"));
    if (snap.exists()) {
        weeklyRoutine = { ...weeklyRoutine, ...snap.data() };
    }
    renderPlannerDay();
}

function renderPlannerDay() {
    const day = document.getElementById('planner-day-dropdown').value;
    const list = document.getElementById('planner-list');
    list.innerHTML = '';
    
    if (weeklyRoutine[day].length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">Rest day. No exercises added.</p>';
        return;
    }

    weeklyRoutine[day].forEach((exId, index) => {
        const ex = EXERCISE_DB.find(e => e.id === exId);
        if (ex) {
            const item = document.createElement('div');
            item.className = 'exercise-item';
            item.innerHTML = `<span>${ex.name}</span> <button class="danger-btn" style="padding: 4px 8px; font-size:12px;">Remove</button>`;
            item.querySelector('button').addEventListener('click', () => {
                weeklyRoutine[day].splice(index, 1);
                renderPlannerDay();
            });
            list.appendChild(item);
        }
    });
}

document.getElementById('planner-day-dropdown').addEventListener('change', renderPlannerDay);

// Add to Planner from Modal
document.getElementById('add-to-planner-btn').addEventListener('click', () => {
    const day = document.getElementById('modal-day-select').value;
    if (!weeklyRoutine[day].includes(selectedExerciseForModal.id)) {
        weeklyRoutine[day].push(selectedExerciseForModal.id);
        document.getElementById('planner-day-dropdown').value = day;
        renderPlannerDay();
        alert(`${selectedExerciseForModal.name} added to ${day}! Don't forget to save.`);
    }
    document.getElementById('global-modal').style.display = 'none';
});

// Save Planner to DB
document.getElementById('save-planner-btn').addEventListener('click', async () => {
    await setDoc(doc(db, "users", currentUser.uid, "planner", "weekly"), weeklyRoutine);
    setupTodaySession(); // Refresh today's session based on new plan
    alert("Weekly plan saved securely.");
});

// --- 6. Today's Session Logic ---
function getTodayName() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
}

function setupTodaySession() {
    const today = getTodayName();
    todayExercises = [...weeklyRoutine[today]]; // Clone today's planned exercises
    renderTodaySession();
}

function renderTodaySession() {
    const list = document.getElementById('daily-exercise-list');
    list.innerHTML = '';
    
    if (todayExercises.length === 0) {
        list.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">No exercises planned. Add some from the Library!</div>';
        document.getElementById('active-workout-card').style.display = 'none';
        return;
    }

    todayExercises.forEach(exId => {
        const ex = EXERCISE_DB.find(e => e.id === exId);
        if (ex) {
            const item = document.createElement('div');
            item.className = 'exercise-item';
            item.innerHTML = `<strong>${ex.name}</strong> <button class="action-btn" style="background:#10B981;">Do Now</button>`;
            item.querySelector('button').addEventListener('click', () => openActiveWorkout(ex));
            list.appendChild(item);
        }
    });
}

// Add one-off to Today from Modal
document.getElementById('add-to-today-btn').addEventListener('click', () => {
    if (!todayExercises.includes(selectedExerciseForModal.id)) {
        todayExercises.push(selectedExerciseForModal.id);
        renderTodaySession();
        
        // Jump to session tab
        document.querySelectorAll('.nav-item, .screen').forEach(el => el.classList.remove('active'));
        document.querySelector('[data-target="tab-routine"]').classList.add('active');
        document.getElementById('tab-routine').classList.add('active');
    }
    document.getElementById('global-modal').style.display = 'none';
});

// Active Workout Form
function openActiveWorkout(ex) {
    document.getElementById('active-workout-card').style.display = 'block';
    document.getElementById('current-exercise-name').textContent = ex.name;
    document.getElementById('current-target-muscle').textContent = `Target: ${ex.muscle}`;
    
    const ytContainer = document.getElementById('yt-container');
    if (ex.yt) {
        ytContainer.style.display = 'block';
        document.getElementById('yt-player').src = `https://www.youtube.com/embed/${ex.yt}`;
    } else {
        ytContainer.style.display = 'none';
    }
    
    // Reset Sets
    document.getElementById('sets-container').innerHTML = `
        <div class="set-row">
            <span style="width: 50px; font-weight: bold;">Set 1</span>
            <input type="number" placeholder="Reps" class="rep-input form-input">
            <input type="number" placeholder="Weight" class="weight-input form-input">
        </div>`;
}

// Add Set Input
document.getElementById('add-set-btn').addEventListener('click', () => {
    const container = document.getElementById('sets-container');
    const setCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'set-row';
    div.innerHTML = `<span style="width: 50px; font-weight: bold;">Set ${setCount}</span>
                     <input type="number" placeholder="Reps" class="rep-input form-input">
                     <input type="number" placeholder="Weight" class="weight-input form-input">`;
    container.appendChild(div);
});

// Save Sets to DB
document.getElementById('save-workout-btn').addEventListener('click', async () => {
    const exName = document.getElementById('current-exercise-name').textContent;
    const reps = document.querySelectorAll('.rep-input');
    const weights = document.querySelectorAll('.weight-input');
    let setsData = [];
    
    for (let i=0; i<reps.length; i++) {
        if (reps[i].value && weights[i].value) {
            setsData.push({ set: i+1, reps: Number(reps[i].value), weight: Number(weights[i].value) });
        }
    }

    if (setsData.length === 0) return alert("Enter at least one set.");

    await addDoc(collection(db, "users", currentUser.uid, "history"), {
        exerciseName: exName,
        sets: setsData,
        date: serverTimestamp()
    });
    
    alert(`Logged ${setsData.length} sets for ${exName}!`);
    document.getElementById('active-workout-card').style.display = 'none';
});

// --- 7. Calendar & Consistency Logging ---
document.getElementById('finish-session-btn').addEventListener('click', async () => {
    // Generate date string in local timezone (Pune, India)
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset() * 60000;
    const todayStr = (new Date(localDate - offset)).toISOString().split('T')[0];
    
    await setDoc(doc(db, "users", currentUser.uid, "calendarLogs", todayStr), {
        completed: true,
        timestamp: serverTimestamp()
    });
    
    alert("Session Finished! Calendar marked.");
    loadCalendarLogs(); // Refresh grid instantly
});

async function loadCalendarLogs() {
    const q = query(collection(db, "users", currentUser.uid, "calendarLogs"));
    const snapshot = await getDocs(q);
    const completedDays = snapshot.docs.map(d => d.id);
    
    document.getElementById('workout-count').textContent = completedDays.length;
    
    const calEl = document.getElementById('workout-calendar');
    calEl.innerHTML = '';
    
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset() * 60000;
    
    for (let i = 27; i >= 0; i--) {
        const d = new Date(localDate - offset - (i * 24 * 60 * 60 * 1000));
        const dayStr = d.toISOString().split('T')[0];
        
        const div = document.createElement('div');
        div.className = `calendar-day ${completedDays.includes(dayStr) ? 'active' : ''}`;
        div.textContent = d.getDate();
        calEl.appendChild(div);
    }
}
