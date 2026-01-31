/* --- 1. NAVIGATION & MOBILE MENU --- */
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu.style.display === "flex") {
        menu.style.display = "none";
    } else {
        menu.style.display = "flex";
    }
}

/* --- 2. SEARCH & FILTER LOGIC --- */
function filterByCity() {
    let input = document.getElementById('citySearch').value.toLowerCase();
    let gender = document.getElementById('genderFilter').value;
    let cards = document.getElementsByClassName('short-card');

    for (let i = 0; i < cards.length; i++) {
        let cityText = cards[i].querySelector('.tag').innerText.toLowerCase();
        let cardGender = cards[i].getAttribute('data-gender'); // Ensure your HTML has data-gender="male/female"
        
        // Logical check for both Search Text and Gender Dropdown
        let matchesCity = cityText.includes(input);
        let matchesGender = (gender === 'all' || cardGender === gender);

        if (matchesCity && matchesGender) {
            cards[i].style.display = "block";
        } else {
            cards[i].style.display = "none";
        }
    }
}

/* --- 3. MODAL MANAGEMENT (Login & Profile) --- */
// Open Login Modal
function openLoginModal() {
    document.getElementById('loginModal').style.display = "block";
}

// Close Login Modal
function closeLoginModal() {
    document.getElementById('loginModal').style.display = "none";
}

// Toggle Full Profile Modal
function toggleModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = (modal.style.display === "block") ? "none" : "block";
    }
}

// Close modals if user clicks outside of the box
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const profileModal = document.getElementById('profileModal');
    if (event.target == loginModal) {
        closeLoginModal();
    }
    if (event.target == profileModal) {
        toggleModal();
    }
}

/* --- 4. LOGIN FORM HANDLER --- */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;

        if(email && pass) {
            alert("Logging in... Redirecting to your dashboard.");
            closeLoginModal();
            // Developer Note: Insert AJAX/Fetch call here to verify credentials
        }
    };
}

/* --- 5. PAYMENT & UNLOCK LOGIC --- */
function processUnlock(amount) {
    const confirmed = confirm(`Proceed to pay $${amount} via Mobile Money to unlock this contact?`);
    if (confirmed) {
        // This simulates a successful payment response
        alert("Payment Successful! Revealing hidden details.");
        
        const lockedOverlay = document.querySelector('.locked-overlay');
        const blurredContent = document.querySelector('.locked-content');
        
        if (lockedOverlay && blurredContent) {
            lockedOverlay.style.display = 'none';
            blurredContent.classList.remove('blurred');
        }
    }
}

/* --- 6. MULTI-STEP REGISTRATION LOGIC --- */
// (This part is specifically for register.html)
let currentTab = 0;
const regForm = document.getElementById('regForm');

if (regForm) {
    showTab(currentTab);
}

function showTab(n) {
    let tabs = document.getElementsByClassName("tab");
    if (tabs.length > 0) {
        tabs[n].style.display = "block";
        
        if (n == 0) {
            document.getElementById("prevBtn").style.display = "none";
        } else {
            document.getElementById("prevBtn").style.display = "inline";
        }
        
        if (n == (tabs.length - 1)) {
            document.getElementById("nextBtn").innerHTML = "Submit Profile";
        } else {
            document.getElementById("nextBtn").innerHTML = "Next Step";
        }
        updateStepIndicator(n);
    }
}

function nextPrev(n) {
    let tabs = document.getElementsByClassName("tab");
    tabs[currentTab].style.display = "none";
    currentTab = currentTab + n;
    
    if (currentTab >= tabs.length) {
        alert("Success! Your profile has been submitted for verification.");
        window.location.href = "index.html"; // Redirect to home
        return false;
    }
    showTab(currentTab);
}

function updateStepIndicator(n) {
    let steps = document.getElementsByClassName("step");
    for (let i = 0; i < steps.length; i++) {
        steps[i].className = steps[i].className.replace(" active", "");
    }
    if (steps[n]) steps[n].className += " active";
}