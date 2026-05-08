import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Your SweatSmart Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCf1h7MkWXp4xoaX4inBHcFjSqphV3CNlo",
    authDomain: "sweatsmart-4feed.firebaseapp.com",
    projectId: "sweatsmart-4feed",
    storageBucket: "sweatsmart-4feed.firebasestorage.app",
    messagingSenderId: "736957038232",
    appId: "1:736957038232:web:d538ade380cd3251085aed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainContent = document.querySelector('.app-content');
const bottomNav = document.querySelector('.bottom-nav');
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

// --- 1. Authentication Logic ---
loginBtn.addEventListener('click', async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed", error);
        alert("Login failed. Check console for details.");
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Listen for Auth State Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authScreen.style.display = 'none';
        mainContent.style.display = 'block';
        bottomNav.style.display = 'flex';
        
        await loadUserData(user.uid);
    } else {
        currentUser = null;
        authScreen.style.display = 'flex';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
    }
});

// --- 2. Tab Navigation Logic ---
const navItems = document.querySelectorAll('.nav-item');
const screens = document.querySelectorAll('.screen');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        
        // Remove active class from all
        navItems.forEach(nav => nav.classList.remove('active'));
        screens.forEach(screen => screen.classList.remove('active'));
        
        // Add active class to clicked
        item.classList.add('active');
        document.getElementById(targetId).classList.add('active');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// --- 3. Database Logic: Load & Save Metrics ---
async function loadUserData(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const data = userSnap.data();
        
        if (data.weight) document.getElementById('weight-input').value = data.weight;
        if (data.bodyFat) document.getElementById('fat-input').value = data.bodyFat;
        if (data.streak) document.getElementById('streak-display').textContent = `${data.streak} Days`;
    }
}

document.getElementById('save-metrics-btn').addEventListener('click', async () => {
    if (!currentUser) return;

    const weight = document.getElementById('weight-input').value;
    const bodyFat = document.getElementById('fat-input').value;

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            weight: Number(weight),
            bodyFat: Number(bodyFat),
            lastUpdated: serverTimestamp()
        }, { merge: true }); // merge: true prevents overwriting other data like 'streak'
        
        alert("Metrics updated successfully!");
    } catch (error) {
        console.error("Error updating metrics", error);
    }
});

// --- 4. Database Logic: Workout Routine Input ---
let setCounter = 1;

// Add dynamic rows for sets
document.getElementById('add-set-btn').addEventListener('click', () => {
    setCounter++;
    const container = document.getElementById('sets-container');
    const newSet = document.createElement('div');
    newSet.className = 'set-row';
    newSet.innerHTML = `
        <span style="width: 50px;">Set ${setCounter}</span>
        <input type="number" placeholder="Reps" class="rep-input form-input">
        <input type="number" placeholder="Weight (kg)" class="weight-input form-input">
    `;
    container.appendChild(newSet);
});

// Save Workout to Firestore History
document.getElementById('save-workout-btn').addEventListener('click', async () => {
    if (!currentUser) return;

    const exerciseName = document.getElementById('current-exercise').textContent; 
    const repsInputs = document.querySelectorAll('.rep-input');
    const weightInputs = document.querySelectorAll('.weight-input');
    
    const setsData = [];
    for (let i = 0; i < repsInputs.length; i++) {
        if (repsInputs[i].value && weightInputs[i].value) {
            setsData.push({
                set: i + 1,
                reps: Number(repsInputs[i].value),
                weight: Number(weightInputs[i].value)
            });
        }
    }

    if (setsData.length === 0) {
        alert("Please enter at least one valid set with reps and weight.");
        return;
    }

    try {
        // Save to a subcollection "workoutHistory" under the user's document
        const historyRef = collection(db, "users", currentUser.uid, "workoutHistory");
        await addDoc(historyRef, {
            exerciseName: exerciseName,
            sets: setsData,
            date: serverTimestamp()
        });
        
        alert("Workout saved to history!");
        
        // Reset the inputs after saving
        document.getElementById('sets-container').innerHTML = `
            <div class="set-row">
                <span style="width: 50px;">Set 1</span>
                <input type="number" placeholder="Reps" class="rep-input form-input">
                <input type="number" placeholder="Weight (kg)" class="weight-input form-input">
            </div>
        `;
        setCounter = 1;

    } catch (error) {
        console.error("Error saving workout:", error);
    }
});