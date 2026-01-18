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