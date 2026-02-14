const STORAGE_KEYS = {
    pending: "liberiaDatePendingProfiles",
    approved: "liberiaDateApprovedProfiles",
    unlockedContacts: "liberiaDateUnlockedContacts"
};

const FALLBACK_PHOTO = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80";
const CONTACT_UNLOCK_PRICE_USD = 3;
let currentModalProfileId = null;
let recorderStream = null;
let mediaRecorder = null;
let recorderChunks = [];
let recorderTimerInterval = null;
let recorderStartedAt = 0;
let recordedIntroVideoFile = null;

const seedProfiles = [
    {
        id: "seed-1",
        name: "Miatta Cooper",
        age: 26,
        gender: "female",
        lookingFor: "men",
        city: "Monrovia",
        occupation: "Nurse",
        bio: "Faith-driven and family-oriented. I enjoy gospel music, beach walks, and meaningful conversations.",
        phone: "+231 77 321 1001",
        whatsapp: "+231 88 321 1001",
        cardPhoto: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
        fullBodyPhoto1: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
        fullBodyPhoto2: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
        introVideo: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        status: "approved"
    },
    {
        id: "seed-2",
        name: "Emmanuel Kpadeh",
        age: 31,
        gender: "male",
        lookingFor: "women",
        city: "Gbarnga",
        occupation: "Civil Engineer",
        bio: "Calm, ambitious, and ready to build a committed relationship with someone kind and honest.",
        phone: "+231 88 212 9921",
        whatsapp: "+231 77 212 9921",
        cardPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
        fullBodyPhoto1: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
        fullBodyPhoto2: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=800&q=80",
        introVideo: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        status: "approved"
    },
    {
        id: "seed-3",
        name: "Musu Garley",
        age: 29,
        gender: "female",
        lookingFor: "men",
        city: "Buchanan",
        occupation: "Business Owner",
        bio: "I value loyalty and growth. I run a small fashion shop and love traveling around Liberia.",
        phone: "+231 77 610 4420",
        whatsapp: "+231 88 610 4420",
        cardPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
        fullBodyPhoto1: "https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=800&q=80",
        fullBodyPhoto2: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
        introVideo: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        status: "approved"
    }
];

function getCardPhoto(profile) {
    return profile.cardPhoto || profile.photo || FALLBACK_PHOTO;
}

function getFullBodyPhotos(profile) {
    const fromArray = Array.isArray(profile.fullBodyPhotos) ? profile.fullBodyPhotos : [];
    const photo1 = profile.fullBodyPhoto1 || fromArray[0] || getCardPhoto(profile);
    const photo2 = profile.fullBodyPhoto2 || fromArray[1] || photo1;
    return [photo1 || FALLBACK_PHOTO, photo2 || FALLBACK_PHOTO];
}

function getWhatsapp(profile) {
    return profile.whatsapp || "";
}

function getIntroVideo(profile) {
    return profile.introVideo || "";
}

function getProfiles(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function setProfiles(key, profiles) {
    localStorage.setItem(key, JSON.stringify(profiles));
}

function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);

        video.preload = "metadata";
        video.onloadedmetadata = () => {
            const duration = video.duration;
            URL.revokeObjectURL(objectUrl);
            resolve(duration);
        };
        video.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Unable to read intro video."));
        };
        video.src = objectUrl;
    });
}

function formatRecordSeconds(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function stopRecorderStream() {
    if (recorderStream) {
        recorderStream.getTracks().forEach((track) => track.stop());
        recorderStream = null;
    }
}

function clearRecorderTimer() {
    if (recorderTimerInterval) {
        window.clearInterval(recorderTimerInterval);
        recorderTimerInterval = null;
    }
}

function resetDesktopRecorderUi() {
    const timer = document.getElementById("recordTimer");
    const beginBtn = document.getElementById("beginRecordBtn");
    const stopBtn = document.getElementById("stopRecordBtn");
    const preview = document.getElementById("recordPreview");
    const wrap = document.getElementById("desktopRecorder");
    if (timer) {
        timer.textContent = "";
        timer.classList.add("is-hidden");
    }
    if (beginBtn) beginBtn.classList.remove("is-hidden");
    if (stopBtn) stopBtn.classList.add("is-hidden");
    if (preview) {
        preview.srcObject = null;
    }
    if (wrap) wrap.classList.add("is-hidden");
}

function stopActiveRecordingIfAny() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
}

async function uploadProfileMedia() {
    const cardPhotoInput = document.getElementById("cardPhoto");
    const fullBodyPhoto1Input = document.getElementById("fullBodyPhoto1");
    const fullBodyPhoto2Input = document.getElementById("fullBodyPhoto2");
    const introVideoRecordInput = document.getElementById("introVideoRecord");

    const cardPhotoFile = cardPhotoInput?.files?.[0];
    const fullBodyPhoto1File = fullBodyPhoto1Input?.files?.[0];
    const fullBodyPhoto2File = fullBodyPhoto2Input?.files?.[0];
    const introVideoFile = introVideoRecordInput?.files?.[0] || recordedIntroVideoFile;

    if (!cardPhotoFile || !fullBodyPhoto1File || !fullBodyPhoto2File || !introVideoFile) {
        throw new Error("Please record an intro video, then submit.");
    }

    if (!introVideoFile.type.startsWith("video/")) {
        throw new Error("Intro video must be a valid video file.");
    }

    const introDuration = await getVideoDuration(introVideoFile);
    if (!Number.isFinite(introDuration) || introDuration > 60) {
        throw new Error("Intro video must be 1 minute or less.");
    }

    const formData = new FormData();
    formData.append("cardPhoto", cardPhotoFile);
    formData.append("fullBodyPhoto1", fullBodyPhoto1File);
    formData.append("fullBodyPhoto2", fullBodyPhoto2File);
    formData.append("introVideo", introVideoFile);

    const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData
    });
    let result = {};
    try {
        result = await response.json();
    } catch (error) {
        throw new Error("Upload failed. Make sure the server is running and try again.");
    }

    if (!response.ok || !result.media) {
        throw new Error(result.error || "Media upload failed.");
    }

    return result.media;
}

function setupIntroVideoRecorder(form) {
    const recordButton = document.getElementById("startRecordVideoBtn");
    const recordInput = document.getElementById("introVideoRecord");
    const recordedName = document.getElementById("recordedVideoName");
    const desktopRecorder = document.getElementById("desktopRecorder");
    const preview = document.getElementById("recordPreview");
    const beginBtn = document.getElementById("beginRecordBtn");
    const stopBtn = document.getElementById("stopRecordBtn");
    const timer = document.getElementById("recordTimer");
    if (!recordButton || !recordInput) return;

    recordButton.addEventListener("click", async () => {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            recordInput.click();
            return;
        }

        try {
            stopActiveRecordingIfAny();
            stopRecorderStream();
            clearRecorderTimer();
            recorderChunks = [];
            recorderStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            if (desktopRecorder) desktopRecorder.classList.remove("is-hidden");
            if (preview) preview.srcObject = recorderStream;
            if (timer) {
                timer.classList.add("is-hidden");
                timer.textContent = "";
            }
        } catch (error) {
            recordInput.click();
        }
    });

    recordInput.addEventListener("change", () => {
        const selectedFile = recordInput.files?.[0];
        if (!recordedName) return;
        if (selectedFile) {
            recordedName.textContent = `Recorded video: ${selectedFile.name}`;
            recordedName.classList.remove("is-hidden");
        } else {
            recordedName.textContent = "";
            recordedName.classList.add("is-hidden");
        }
    });

    if (beginBtn) {
        beginBtn.addEventListener("click", () => {
            if (!recorderStream || !recordInput) return;

            recorderChunks = [];
            mediaRecorder = new MediaRecorder(recorderStream);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recorderChunks.push(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recorderChunks, { type: "video/webm" });
                const file = new File([blob], `intro-${Date.now()}.webm`, { type: "video/webm" });
                recordedIntroVideoFile = file;
                try {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    recordInput.files = dt.files;
                } catch (error) {
                    // Keep fallback in memory for browsers that block programmatic file assignment.
                }

                if (recordedName) {
                    recordedName.textContent = `Recorded video: ${file.name}`;
                    recordedName.classList.remove("is-hidden");
                }

                clearRecorderTimer();
                stopRecorderStream();
                resetDesktopRecorderUi();
            };

            mediaRecorder.start();
            recorderStartedAt = Date.now();
            if (timer) {
                timer.classList.remove("is-hidden");
                timer.textContent = "Recording 00:00 (max 01:00)";
            }
            if (beginBtn) beginBtn.classList.add("is-hidden");
            if (stopBtn) stopBtn.classList.remove("is-hidden");

            clearRecorderTimer();
            recorderTimerInterval = window.setInterval(() => {
                const seconds = Math.floor((Date.now() - recorderStartedAt) / 1000);
                if (timer) {
                    timer.textContent = `Recording ${formatRecordSeconds(seconds)} (max 01:00)`;
                }
                if (seconds >= 60) {
                    stopActiveRecordingIfAny();
                }
            }, 250);
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener("click", () => {
            stopActiveRecordingIfAny();
        });
    }

    form.addEventListener("reset", () => {
        recordedIntroVideoFile = null;
        if (recordedName) {
            recordedName.textContent = "";
            recordedName.classList.add("is-hidden");
        }
        stopActiveRecordingIfAny();
        clearRecorderTimer();
        stopRecorderStream();
        resetDesktopRecorderUi();
    });
}

function hasUnlockedContact(profileId) {
    const unlocked = getProfiles(STORAGE_KEYS.unlockedContacts);
    return unlocked.includes(profileId);
}

function unlockContact(profileId) {
    const unlocked = getProfiles(STORAGE_KEYS.unlockedContacts);
    if (!unlocked.includes(profileId)) {
        unlocked.push(profileId);
        setProfiles(STORAGE_KEYS.unlockedContacts, unlocked);
    }
}

function showGlobalNotice(message, isError = false) {
    const notice = document.getElementById("globalNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.classList.remove("is-hidden");
    notice.classList.toggle("notice-error", isError);
}

function clearPaymentQueryParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete("session_id");
    url.searchParams.delete("profile_id");
    url.searchParams.delete("payment");
    const updatedPath = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", updatedPath);
}

async function processStripeReturn() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const profileId = params.get("profile_id");
    const paymentStatus = params.get("payment");

    if (paymentStatus === "cancelled") {
        showGlobalNotice("Payment cancelled. Contact details remain locked.", true);
        clearPaymentQueryParams();
        return;
    }

    if (!sessionId || !profileId) return;

    try {
        const response = await fetch(
            `/api/verify-payment?session_id=${encodeURIComponent(sessionId)}&profile_id=${encodeURIComponent(profileId)}`
        );
        const result = await response.json();

        if (!response.ok || !result.paid) {
            showGlobalNotice("Payment could not be verified. Please try again.", true);
            clearPaymentQueryParams();
            return;
        }

        unlockContact(profileId);
        showGlobalNotice("Payment verified. Contact details are now unlocked.");
    } catch (error) {
        showGlobalNotice("Unable to verify payment right now. Please retry shortly.", true);
    } finally {
        clearPaymentQueryParams();
    }
}

function initializeSeedData() {
    const approved = getProfiles(STORAGE_KEYS.approved);
    if (approved.length === 0) {
        setProfiles(STORAGE_KEYS.approved, seedProfiles);
    }
}

function profileCardTemplate(profile) {
    return `
        <article class="profile-card">
            <div class="card-photo-wrap">
                <img class="card-photo" src="${getCardPhoto(profile)}" alt="${profile.name}">
                <span class="chip">Verified</span>
            </div>
            <div class="card-body">
                <h3>${profile.name}, ${profile.age}</h3>
                <p>${profile.occupation} - ${profile.city}</p>
                <p class="muted">Looking for ${profile.lookingFor}</p>
                <button class="btn btn-primary" data-view-id="${profile.id}">View Profile</button>
            </div>
        </article>
    `;
}

function renderHomeProfiles() {
    const grid = document.getElementById("profileGrid");
    if (!grid) return;

    const approved = getProfiles(STORAGE_KEYS.approved);
    grid.innerHTML = approved.map(profileCardTemplate).join("");

    grid.querySelectorAll("[data-view-id]").forEach((button) => {
        button.addEventListener("click", () => openProfileModal(button.dataset.viewId));
    });
}

function applyHomeFilters() {
    const grid = document.getElementById("profileGrid");
    if (!grid) return;

    const cityValue = (document.getElementById("citySearch")?.value || "").trim().toLowerCase();
    const lookingForValue = document.getElementById("lookingForFilter")?.value || "all";

    const approved = getProfiles(STORAGE_KEYS.approved);
    const filtered = approved.filter((profile) => {
        const cityMatch = profile.city.toLowerCase().includes(cityValue);
        const lookingForMatch = lookingForValue === "all" || profile.lookingFor === lookingForValue;
        return cityMatch && lookingForMatch;
    });

    grid.innerHTML = filtered.map(profileCardTemplate).join("");
    grid.querySelectorAll("[data-view-id]").forEach((button) => {
        button.addEventListener("click", () => openProfileModal(button.dataset.viewId));
    });
}

function openProfileModal(profileId) {
    const modal = document.getElementById("profileModal");
    if (!modal) return;

    const approved = getProfiles(STORAGE_KEYS.approved);
    const profile = approved.find((entry) => entry.id === profileId);
    if (!profile) return;

    const [fullBody1, fullBody2] = getFullBodyPhotos(profile);
    document.getElementById("modalPhoto").src = getCardPhoto(profile);
    document.getElementById("modalPhoto").alt = `${profile.name} photo`;
    document.getElementById("modalName").textContent = `${profile.name}, ${profile.age}`;
    document.getElementById("modalMeta").textContent = `${profile.occupation} - ${profile.city} - Looking for ${profile.lookingFor}`;
    document.getElementById("modalBio").textContent = profile.bio;
    document.getElementById("modalFullBody1").src = fullBody1;
    document.getElementById("modalFullBody1").alt = `${profile.name} full body photo 1`;
    document.getElementById("modalFullBody2").src = fullBody2;
    document.getElementById("modalFullBody2").alt = `${profile.name} full body photo 2`;
    const introVideo = getIntroVideo(profile);
    const introVideoWrap = document.getElementById("introVideoWrap");
    const introVideoNode = document.getElementById("modalIntroVideo");
    if (introVideo && introVideoNode && introVideoWrap) {
        introVideoNode.src = introVideo;
        introVideoWrap.classList.remove("is-hidden");
    } else if (introVideoNode && introVideoWrap) {
        introVideoNode.removeAttribute("src");
        introVideoNode.load();
        introVideoWrap.classList.add("is-hidden");
    }
    currentModalProfileId = profile.id;
    renderContactAccess(profile);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;
    const introVideoNode = document.getElementById("modalIntroVideo");
    if (introVideoNode) {
        introVideoNode.pause();
    }
    currentModalProfileId = null;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

function renderContactAccess(profile) {
    const lockBox = document.getElementById("contactLockBox");
    const phone = document.getElementById("modalPhone");
    const whatsapp = document.getElementById("modalWhatsapp");
    const contactStatus = document.getElementById("contactStatus");
    const unlockButton = document.getElementById("unlockContactBtn");
    const unlocked = hasUnlockedContact(profile.id);
    if (!lockBox || !phone || !whatsapp || !contactStatus) return;

    if (unlocked) {
        lockBox.classList.add("is-hidden");
        phone.classList.remove("is-hidden");
        whatsapp.classList.remove("is-hidden");
        phone.textContent = `Contact: ${profile.phone}`;
        whatsapp.textContent = `WhatsApp: ${getWhatsapp(profile) || profile.phone}`;
    } else {
        lockBox.classList.remove("is-hidden");
        phone.classList.add("is-hidden");
        whatsapp.classList.add("is-hidden");
        phone.textContent = "";
        whatsapp.textContent = "";
        contactStatus.textContent = `Pay USD ${CONTACT_UNLOCK_PRICE_USD.toFixed(2)} to view ${profile.name}'s contact number.`;
        if (unlockButton) unlockButton.disabled = false;
    }
}

async function handleUnlockPayment() {
    if (!currentModalProfileId) return;

    const approved = getProfiles(STORAGE_KEYS.approved);
    const profile = approved.find((entry) => entry.id === currentModalProfileId);
    if (!profile) return;

    const unlockButton = document.getElementById("unlockContactBtn");
    const contactStatus = document.getElementById("contactStatus");
    if (unlockButton) unlockButton.disabled = true;
    if (contactStatus) {
        contactStatus.textContent = "Preparing secure checkout...";
    }

    try {
        const response = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: profile.id })
        });
        const result = await response.json();

        if (!response.ok || !result.url) {
            throw new Error(result.error || "Checkout session failed");
        }

        window.location.href = result.url;
    } catch (error) {
        if (contactStatus) {
            contactStatus.textContent = "Unable to start payment. Please try again.";
        }
        if (unlockButton) unlockButton.disabled = false;
    }
}

function bindModalEvents() {
    const closeBtn = document.getElementById("closeModalBtn");
    const modal = document.getElementById("profileModal");
    const unlockButton = document.getElementById("unlockContactBtn");
    if (!closeBtn || !modal) return;

    closeBtn.addEventListener("click", closeProfileModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeProfileModal();
        }
    });

    if (unlockButton) {
        unlockButton.addEventListener("click", handleUnlockPayment);
    }
}

function setupRegistrationForm() {
    const form = document.getElementById("registrationForm");
    if (!form) return;
    setupIntroVideoRecorder(form);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector("button[type='submit']");
        const notice = document.getElementById("formNotice");
        if (submitButton) submitButton.disabled = true;
        if (notice) notice.textContent = "Uploading media...";

        try {
            const uploadedMedia = await uploadProfileMedia();
            const newProfile = {
                id: `profile-${Date.now()}`,
                name: document.getElementById("fullName").value.trim(),
                age: Number(document.getElementById("age").value),
                gender: document.getElementById("gender").value,
                lookingFor: document.getElementById("lookingFor").value,
                city: document.getElementById("city").value.trim(),
                occupation: document.getElementById("occupation").value.trim(),
                bio: document.getElementById("bio").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                whatsapp: document.getElementById("whatsapp").value.trim(),
                cardPhoto: uploadedMedia.cardPhoto || FALLBACK_PHOTO,
                fullBodyPhoto1: uploadedMedia.fullBodyPhoto1 || FALLBACK_PHOTO,
                fullBodyPhoto2: uploadedMedia.fullBodyPhoto2 || FALLBACK_PHOTO,
                introVideo: uploadedMedia.introVideo || "",
                status: "pending"
            };

            const pending = getProfiles(STORAGE_KEYS.pending);
            pending.push(newProfile);
            setProfiles(STORAGE_KEYS.pending, pending);

            form.reset();
            if (notice) {
                notice.textContent = "Profile submitted successfully. Admin review is required before listing.";
            }
        } catch (error) {
            if (notice) {
                notice.textContent = error.message || "Unable to submit profile right now.";
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function renderAdminTable() {
    const tableBody = document.getElementById("adminUserTable");
    if (!tableBody) return;

    const pending = getProfiles(STORAGE_KEYS.pending);
    const approved = getProfiles(STORAGE_KEYS.approved);

    document.getElementById("pendingCount").textContent = String(pending.length);
    document.getElementById("approvedCount").textContent = String(approved.length);

    const empty = document.getElementById("emptyPending");
    if (pending.length === 0) {
        tableBody.innerHTML = "";
        if (empty) empty.textContent = "No pending profiles right now.";
        return;
    }

    if (empty) empty.textContent = "";

    tableBody.innerHTML = pending.map((profile) => `
        <tr>
            <td><img class="admin-thumb" src="${getCardPhoto(profile)}" alt="${profile.name}"></td>
            <td>${profile.name}</td>
            <td>${profile.age}</td>
            <td>${profile.city}</td>
            <td>${profile.lookingFor}</td>
            <td>${profile.phone}</td>
            <td>${getWhatsapp(profile) || "-"}</td>
            <td>
                <button class="btn btn-primary btn-sm" data-approve-id="${profile.id}">Approve</button>
                <button class="btn btn-danger btn-sm" data-delete-id="${profile.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tableBody.querySelectorAll("[data-approve-id]").forEach((button) => {
        button.addEventListener("click", () => approvePendingProfile(button.dataset.approveId));
    });

    tableBody.querySelectorAll("[data-delete-id]").forEach((button) => {
        button.addEventListener("click", () => deletePendingProfile(button.dataset.deleteId));
    });
}

function approvePendingProfile(profileId) {
    const pending = getProfiles(STORAGE_KEYS.pending);
    const approved = getProfiles(STORAGE_KEYS.approved);
    const match = pending.find((entry) => entry.id === profileId);
    if (!match) return;

    const updatedPending = pending.filter((entry) => entry.id !== profileId);
    approved.push({ ...match, status: "approved" });

    setProfiles(STORAGE_KEYS.pending, updatedPending);
    setProfiles(STORAGE_KEYS.approved, approved);
    renderAdminTable();
}

function deletePendingProfile(profileId) {
    const pending = getProfiles(STORAGE_KEYS.pending);
    const updatedPending = pending.filter((entry) => entry.id !== profileId);
    setProfiles(STORAGE_KEYS.pending, updatedPending);
    renderAdminTable();
}

function bindHomeFilters() {
    const cityInput = document.getElementById("citySearch");
    const lookingFor = document.getElementById("lookingForFilter");

    if (cityInput) {
        cityInput.addEventListener("input", applyHomeFilters);
    }

    if (lookingFor) {
        lookingFor.addEventListener("change", applyHomeFilters);
    }
}

function setYearText() {
    const yearNodes = document.querySelectorAll("#yearText");
    yearNodes.forEach((node) => {
        node.textContent = `Copyright ${new Date().getFullYear()} Liberia Date`;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    initializeSeedData();
    await processStripeReturn();
    setYearText();
    bindHomeFilters();
    bindModalEvents();
    renderHomeProfiles();
    setupRegistrationForm();
    renderAdminTable();
});
