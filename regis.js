let currentTab = 0;
showTab(currentTab);

function showTab(n) {
    let tabs = document.getElementsByClassName("tab");
    tabs[n].style.display = "block";
    
    if (n == 0) {
        document.getElementById("prevBtn").style.display = "none";
    } else {
        document.getElementById("prevBtn").style.display = "inline";
    }
    
    if (n == (tabs.length - 1)) {
        document.getElementById("nextBtn").innerHTML = "Submit & Create Profile";
    } else {
        document.getElementById("nextBtn").innerHTML = "Next Step";
    }
    fixStepIndicator(n);
}

function nextPrev(n) {
    let tabs = document.getElementsByClassName("tab");
    tabs[currentTab].style.display = "none";
    currentTab = currentTab + n;
    
    if (currentTab >= tabs.length) {
        alert("Registration Complete! Your profile is pending verification.");
        // Here, the developer would send the data to the server
        return false;
    }
    showTab(currentTab);
}

function fixStepIndicator(n) {
    let steps = document.getElementsByClassName("step");
    for (let i = 0; i < steps.length; i++) {
        steps[i].className = steps[i].className.replace(" active", "");
    }
    steps[n].className += " active";
}