document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Mobile Menu Toggle ---
    // Note: You'll need to add a 'hamburger' div to your HTML for this to trigger
    const createMobileMenu = () => {
        const nav = document.querySelector('.navbar');
        const navLinks = document.querySelector('.nav-links');
        
        // Create hamburger element
        const hamburger = document.createElement('div');
        hamburger.classList.add('mobile-menu-icon');
        hamburger.innerHTML = '&#9776;'; // Hamburger icon
        hamburger.style.fontSize = '2rem';
        hamburger.style.cursor = 'pointer';
        hamburger.style.display = 'none'; // Hidden by default on desktop

        nav.insertBefore(hamburger, navLinks);

        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.innerHTML = navLinks.classList.contains('active') ? '&times;' : '&#9776;';
        });
    };

    // --- 2. Smooth Scrolling for Navigation ---
    const setupSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // --- 3. Impact Metric Counter Animation ---
    // This makes the numbers "count up" when they scroll into view
    const animateCounters = () => {
        const counters = document.querySelectorAll('.metric-card h3');
        const speed = 200;

        const startCount = (counter) => {
            const target = +counter.innerText.replace(/\D/g, ''); // Get the number
            const count = +counter.getAttribute('data-count') || 0;
            const inc = target / speed;

            if (count < target) {
                counter.setAttribute('data-count', count + inc);
                counter.innerText = Math.ceil(count + inc) + (counter.innerText.includes('+') ? '+' : '');
                setTimeout(() => startCount(counter), 1);
            } else {
                counter.innerText = target + (counter.innerText.includes('+') ? '+' : '');
            }
        };

        // Trigger animation when the section is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startCount(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    };

    // Initialize all functions
    createMobileMenu();
    setupSmoothScroll();
    animateCounters();
});
//  campaign script
document.addEventListener('DOMContentLoaded', () => {
    const campaignForm = document.getElementById('campaign-form');

    if (campaignForm) {
        campaignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Visual feedback
            const btn = campaignForm.querySelector('button');
            btn.innerText = "Sending...";
            btn.style.opacity = "0.7";
            btn.disabled = true;

            setTimeout(() => {
                alert("Your campaign proposal has been submitted! Our team will review it and contact you via email within 3-5 business days.");
                campaignForm.reset();
                btn.innerText = "Submit Proposal";
                btn.style.opacity = "1";
                btn.disabled = false;
            }, 1500);
        });
    }
});

// community screipt

document.addEventListener('DOMContentLoaded', () => {
    const communityForm = document.getElementById('community-form');

    if (communityForm) {
        communityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = communityForm.querySelector('button');
            const originalText = submitBtn.innerText;
            
            // Animation for feedback
            submitBtn.innerText = "Processing...";
            submitBtn.style.background = "#219150";

            setTimeout(() => {
                alert("Welcome to the Compassion Project community! You'll receive your first impact update shortly.");
                communityForm.reset();
                submitBtn.innerText = originalText;
                submitBtn.style.background = "#27ae60";
            }, 1200);
        });
    }
});

// volunteer script
document.addEventListener('DOMContentLoaded', () => {
    const volForm = document.getElementById('volunteer-form-action');

    if (volForm) {
        volForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = volForm.querySelector('button');
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            // Simulate server delay
            setTimeout(() => {
                alert("Application Sent! Our volunteer coordinator will reach out to you within 48 hours. Thank you for your heart to serve.");
                volForm.reset();
                submitBtn.innerText = "Send My Application";
                submitBtn.disabled = false;
            }, 1500);
        });
    }
});

// payment script
document.addEventListener('DOMContentLoaded', () => {
    const proceedBtn = document.getElementById('proceed-to-pay-btn'); // Matches your previous ID
    const customInput = document.getElementById('custom-amt-input');

    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            // Find which amount is selected
            const activeBtn = document.querySelector('.donation-amt-btn.active-amt');
            const amount = activeBtn ? activeBtn.getAttribute('data-val') : customInput.value;

            if (amount > 0) {
                // OPEN NEW WINDOW
                // This passes the amount to the new window using the URL
                window.open(checkout.html?amount=${amount}, '_blank', 'width=500,height=700');
            } else {
                alert("Please select or enter an amount first.");
            }
        });
    }
});