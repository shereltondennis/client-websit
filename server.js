const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const CONTACT_UNLOCK_PRICE_CENTS = Number(process.env.CONTACT_UNLOCK_PRICE_CENTS || 300);
const CONTACT_UNLOCK_CURRENCY = (process.env.CONTACT_UNLOCK_CURRENCY || "usd").toLowerCase();
const ADMIN_SESSION_COOKIE = "liberiaDateAdminSession";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const uploadsDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "liberiadate.db");
const adminSessions = new Map();

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

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
        hasChildren: "no",
        childrenDetails: "",
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
        hasChildren: "yes",
        childrenDetails: "1 child (age 6)",
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
        hasChildren: "yes",
        childrenDetails: "2 children (ages 5 and 8)",
        cardPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
        fullBodyPhoto1: "https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=800&q=80",
        fullBodyPhoto2: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
        introVideo: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        status: "approved"
    }
];

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            lookingFor TEXT NOT NULL,
            city TEXT NOT NULL,
            occupation TEXT NOT NULL,
            bio TEXT NOT NULL,
            phone TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            hasChildren TEXT NOT NULL,
            childrenDetails TEXT NOT NULL DEFAULT '',
            cardPhoto TEXT NOT NULL,
            fullBodyPhoto1 TEXT NOT NULL,
            fullBodyPhoto2 TEXT NOT NULL,
            introVideo TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'approved')),
            createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            createdAt TEXT NOT NULL,
            profileId TEXT NOT NULL,
            reason TEXT NOT NULL,
            reporterName TEXT NOT NULL,
            reporterContact TEXT NOT NULL,
            details TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('open', 'resolved'))
        );

        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            passwordHash TEXT NOT NULL,
            createdAt TEXT NOT NULL
        );
    `);

    const profileCount = db.prepare("SELECT COUNT(*) AS count FROM profiles").get().count;
    if (profileCount > 0) return;

    const insert = db.prepare(`
        INSERT INTO profiles (
            id, name, age, gender, lookingFor, city, occupation, bio, phone, whatsapp,
            hasChildren, childrenDetails, cardPhoto, fullBodyPhoto1, fullBodyPhoto2, introVideo,
            status, createdAt
        ) VALUES (
            @id, @name, @age, @gender, @lookingFor, @city, @occupation, @bio, @phone, @whatsapp,
            @hasChildren, @childrenDetails, @cardPhoto, @fullBodyPhoto1, @fullBodyPhoto2, @introVideo,
            @status, @createdAt
        )
    `);
    const transaction = db.transaction((profiles) => {
        profiles.forEach((profile) => {
            insert.run({
                ...profile,
                createdAt: new Date().toISOString()
            });
        });
    });
    transaction(seedProfiles);
}

initializeDatabase();

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        const safeExtension = extension || ".jpg";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExtension}`;
        callback(null, uniqueName);
    }
});

const mediaUpload = multer({
    storage: uploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype) {
            callback(new Error("Unsupported file type."));
            return;
        }
        if (["cardPhoto", "fullBodyPhoto1", "fullBodyPhoto2"].includes(file.fieldname)) {
            if (file.mimetype.startsWith("image/")) {
                callback(null, true);
                return;
            }
            callback(new Error("Photo uploads must be image files."));
            return;
        }
        if (file.fieldname === "introVideo") {
            if (file.mimetype.startsWith("video/")) {
                callback(null, true);
                return;
            }
            callback(new Error("Intro video must be a video file."));
            return;
        }
        callback(new Error("Unexpected upload field."));
    }
});

app.use(express.json());

function parseCookies(cookieHeader = "") {
    return cookieHeader.split(";").reduce((acc, pair) => {
        const [rawKey, ...rest] = pair.split("=");
        const key = rawKey?.trim();
        if (!key) return acc;
        acc[key] = decodeURIComponent(rest.join("=").trim());
        return acc;
    }, {});
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, hashHex] = String(storedHash || "").split(":");
    if (!salt || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
}

function hasAdminUsers() {
    const row = db.prepare("SELECT COUNT(*) AS count FROM admin_users").get();
    return Number(row?.count || 0) > 0;
}

function createAdminSession() {
    const token = crypto.randomBytes(32).toString("hex");
    adminSessions.set(token, {
        expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
    });
    return token;
}

function clearAdminSession(token) {
    if (token) {
        adminSessions.delete(token);
    }
}

function getValidAdminSessionToken(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[ADMIN_SESSION_COOKIE];
    if (!token) return null;
    const session = adminSessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        adminSessions.delete(token);
        return null;
    }
    session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    return token;
}

function setAdminCookie(res, token) {
    const isProduction = process.env.NODE_ENV === "production";
    const maxAgeSeconds = Math.floor(ADMIN_SESSION_TTL_MS / 1000);
    res.setHeader(
        "Set-Cookie",
        `${ADMIN_SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${isProduction ? "; Secure" : ""}`
    );
}

function clearAdminCookie(res) {
    const isProduction = process.env.NODE_ENV === "production";
    res.setHeader(
        "Set-Cookie",
        `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`
    );
}

function requireAdminAuth(req, res, next) {
    const token = getValidAdminSessionToken(req);
    if (!token) {
        return res.status(401).json({ error: "Admin authentication required." });
    }
    setAdminCookie(res, token);
    return next();
}

function normalizeProfileRow(row) {
    return {
        ...row,
        age: Number(row.age)
    };
}

app.get("/admin.html", (req, res) => {
    const token = getValidAdminSessionToken(req);
    if (!token) {
        return res.redirect("/admin-login.html");
    }
    setAdminCookie(res, token);
    return res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin", (_req, res) => {
    return res.redirect("/admin-login.html");
});

app.get("/admin-login.html", (req, res) => {
    const token = getValidAdminSessionToken(req);
    if (token) {
        setAdminCookie(res, token);
        return res.redirect("/admin.html");
    }
    return res.sendFile(path.join(__dirname, "admin-login.html"));
});

app.get("/admin-setup.html", (req, res) => {
    const token = getValidAdminSessionToken(req);
    if (token) {
        setAdminCookie(res, token);
        return res.redirect("/admin.html");
    }
    return res.redirect("/admin-login.html");
});

app.get("/api/admin/session", (req, res) => {
    const token = getValidAdminSessionToken(req);
    if (!token) {
        return res.status(401).json({ authenticated: false });
    }
    setAdminCookie(res, token);
    return res.json({ authenticated: true });
});

app.post("/api/admin/login", (req, res) => {
    if (!hasAdminUsers()) {
        return res.status(400).json({ error: "No admin account exists yet. Complete admin setup first." });
    }

    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const adminUser = db.prepare("SELECT id, username, passwordHash FROM admin_users WHERE username = ?").get(username);
    if (!adminUser || !verifyPassword(password, adminUser.passwordHash)) {
        return res.status(401).json({ error: "Invalid admin username or password." });
    }

    const token = createAdminSession();
    setAdminCookie(res, token);
    return res.json({ ok: true });
});

app.get("/api/admin/setup-status", (_req, res) => {
    return res.json({ needsSetup: !hasAdminUsers() });
});

app.post("/api/admin/reset-account", (req, res) => {
    const confirm = String(req.body?.confirm || "").trim();
    if (confirm !== "RESET") {
        return res.status(400).json({ error: "Reset confirmation is required." });
    }

    db.prepare("DELETE FROM admin_users").run();
    adminSessions.clear();
    clearAdminCookie(res);
    return res.json({ ok: true });
});

app.post("/api/admin/setup", (req, res) => {
    if (hasAdminUsers()) {
        return res.status(409).json({ error: "Admin setup is already completed." });
    }

    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters." });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const passwordHash = hashPassword(password);
    try {
        db.prepare("INSERT INTO admin_users (username, passwordHash, createdAt) VALUES (?, ?, ?)")
            .run(username, passwordHash, new Date().toISOString());
    } catch (error) {
        if (hasAdminUsers()) {
            return res.status(409).json({ error: "Admin setup is already completed." });
        }
        return res.status(500).json({ error: "Unable to create admin account right now." });
    }

    const token = createAdminSession();
    setAdminCookie(res, token);
    return res.status(201).json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
    const cookies = parseCookies(req.headers.cookie || "");
    clearAdminSession(cookies[ADMIN_SESSION_COOKIE]);
    clearAdminCookie(res);
    return res.json({ ok: true });
});

app.get("/api/profiles", (req, res) => {
    const status = String(req.query.status || "").trim();
    if (status !== "approved") {
        return res.status(400).json({ error: "Only approved profile listing is allowed." });
    }

    const rows = db
        .prepare("SELECT * FROM profiles WHERE status = 'approved' ORDER BY createdAt DESC")
        .all()
        .map(normalizeProfileRow);
    return res.json({ profiles: rows });
});

app.post("/api/profiles", (req, res) => {
    const payload = req.body || {};
    const requiredFields = [
        "name", "age", "gender", "lookingFor", "city", "occupation", "bio", "phone",
        "whatsapp", "hasChildren", "cardPhoto", "fullBodyPhoto1", "fullBodyPhoto2", "introVideo"
    ];
    const missingField = requiredFields.find((field) => String(payload[field] || "").trim() === "");
    if (missingField) {
        return res.status(400).json({ error: `Missing required field: ${missingField}` });
    }

    const age = Number(payload.age);
    if (!Number.isFinite(age) || age < 18 || age > 80) {
        return res.status(400).json({ error: "Age must be between 18 and 80." });
    }

    const hasChildren = payload.hasChildren === "yes" ? "yes" : "no";
    const id = String(payload.id || `profile-${Date.now()}`).trim();
    const createdAt = new Date().toISOString();

    db.prepare(`
        INSERT INTO profiles (
            id, name, age, gender, lookingFor, city, occupation, bio, phone, whatsapp,
            hasChildren, childrenDetails, cardPhoto, fullBodyPhoto1, fullBodyPhoto2, introVideo,
            status, createdAt
        ) VALUES (
            @id, @name, @age, @gender, @lookingFor, @city, @occupation, @bio, @phone, @whatsapp,
            @hasChildren, @childrenDetails, @cardPhoto, @fullBodyPhoto1, @fullBodyPhoto2, @introVideo,
            'pending', @createdAt
        )
    `).run({
        id,
        name: String(payload.name).trim(),
        age,
        gender: String(payload.gender).trim(),
        lookingFor: String(payload.lookingFor).trim(),
        city: String(payload.city).trim(),
        occupation: String(payload.occupation).trim(),
        bio: String(payload.bio).trim(),
        phone: String(payload.phone).trim(),
        whatsapp: String(payload.whatsapp).trim(),
        hasChildren,
        childrenDetails: hasChildren === "yes" ? String(payload.childrenDetails || "").trim() : "",
        cardPhoto: String(payload.cardPhoto).trim(),
        fullBodyPhoto1: String(payload.fullBodyPhoto1).trim(),
        fullBodyPhoto2: String(payload.fullBodyPhoto2).trim(),
        introVideo: String(payload.introVideo).trim(),
        createdAt
    });

    return res.status(201).json({ ok: true, id });
});

app.post("/api/reports", (req, res) => {
    const payload = req.body || {};
    const reason = String(payload.reason || "").trim();
    const reporterName = String(payload.reporterName || "").trim();
    const reporterContact = String(payload.reporterContact || "").trim();
    const details = String(payload.details || "").trim();
    if (!reason || !reporterName || !reporterContact || !details) {
        return res.status(400).json({ error: "Reason, name, contact, and details are required." });
    }

    const id = String(payload.id || `report-${Date.now()}`).trim();
    const createdAt = String(payload.createdAt || new Date().toISOString()).trim();
    db.prepare(`
        INSERT INTO reports (
            id, createdAt, profileId, reason, reporterName, reporterContact, details, status
        ) VALUES (
            @id, @createdAt, @profileId, @reason, @reporterName, @reporterContact, @details, 'open'
        )
    `).run({
        id,
        createdAt,
        profileId: String(payload.profileId || "unknown").trim(),
        reason,
        reporterName,
        reporterContact,
        details
    });

    return res.status(201).json({ ok: true, id });
});

app.get("/api/admin/profiles", requireAdminAuth, (_req, res) => {
    const pending = db
        .prepare("SELECT * FROM profiles WHERE status = 'pending' ORDER BY createdAt DESC")
        .all()
        .map(normalizeProfileRow);
    const approvedCount = db
        .prepare("SELECT COUNT(*) AS count FROM profiles WHERE status = 'approved'")
        .get().count;
    return res.json({ pending, approvedCount: Number(approvedCount) });
});

app.post("/api/admin/profiles/:id/approve", requireAdminAuth, (req, res) => {
    const profileId = String(req.params.id || "").trim();
    const result = db.prepare("UPDATE profiles SET status = 'approved' WHERE id = ?").run(profileId);
    if (!result.changes) {
        return res.status(404).json({ error: "Profile not found." });
    }
    return res.json({ ok: true });
});

app.delete("/api/admin/profiles/:id", requireAdminAuth, (req, res) => {
    const profileId = String(req.params.id || "").trim();
    const result = db.prepare("DELETE FROM profiles WHERE id = ?").run(profileId);
    if (!result.changes) {
        return res.status(404).json({ error: "Profile not found." });
    }
    return res.json({ ok: true });
});

app.get("/api/admin/reports", requireAdminAuth, (_req, res) => {
    const reports = db.prepare("SELECT * FROM reports ORDER BY createdAt DESC").all();
    return res.json({ reports });
});

app.post("/api/admin/reports/:id/resolve", requireAdminAuth, (req, res) => {
    const reportId = String(req.params.id || "").trim();
    const result = db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
    if (!result.changes) {
        return res.status(404).json({ error: "Report not found." });
    }
    return res.json({ ok: true });
});

app.delete("/api/admin/reports/:id", requireAdminAuth, (req, res) => {
    const reportId = String(req.params.id || "").trim();
    const result = db.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
    if (!result.changes) {
        return res.status(404).json({ error: "Report not found." });
    }
    return res.json({ ok: true });
});

app.post("/api/upload-media", (req, res) => {
    mediaUpload.fields([
        { name: "cardPhoto", maxCount: 1 },
        { name: "fullBodyPhoto1", maxCount: 1 },
        { name: "fullBodyPhoto2", maxCount: 1 },
        { name: "introVideo", maxCount: 1 }
    ])(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                error: error.message || "Media upload failed."
            });
        }

        const files = req.files || {};
        const cardPhoto = files.cardPhoto?.[0];
        const fullBodyPhoto1 = files.fullBodyPhoto1?.[0];
        const fullBodyPhoto2 = files.fullBodyPhoto2?.[0];
        const introVideo = files.introVideo?.[0];

        if (!cardPhoto || !fullBodyPhoto1 || !fullBodyPhoto2 || !introVideo) {
            return res.status(400).json({
                error: "3 photos and 1 intro video are required."
            });
        }

        return res.json({
            media: {
                cardPhoto: `/uploads/${cardPhoto.filename}`,
                fullBodyPhoto1: `/uploads/${fullBodyPhoto1.filename}`,
                fullBodyPhoto2: `/uploads/${fullBodyPhoto2.filename}`,
                introVideo: `/uploads/${introVideo.filename}`
            }
        });
    });
});

app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
        return res.status(500).json({
            error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file."
        });
    }

    const profileId = String(req.body?.profileId || "").trim();
    if (!profileId) {
        return res.status(400).json({ error: "Missing profileId." });
    }

    const profile = db.prepare("SELECT id, status FROM profiles WHERE id = ?").get(profileId);
    if (!profile || profile.status !== "approved") {
        return res.status(404).json({ error: "Profile is not available for unlock." });
    }

    try {
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: CONTACT_UNLOCK_CURRENCY,
                        unit_amount: CONTACT_UNLOCK_PRICE_CENTS,
                        product_data: {
                            name: "Liberia Date Contact Unlock",
                            description: `Unlock contact details for profile ${profileId}`
                        }
                    }
                }
            ],
            metadata: {
                profile_id: profileId
            },
            success_url: `${baseUrl}/index.html?session_id={CHECKOUT_SESSION_ID}&profile_id=${encodeURIComponent(profileId)}`,
            cancel_url: `${baseUrl}/index.html?payment=cancelled&profile_id=${encodeURIComponent(profileId)}`
        });

        return res.json({ url: session.url });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to create checkout session."
        });
    }
});

app.get("/api/verify-payment", async (req, res) => {
    if (!stripe) {
        return res.status(500).json({
            error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file."
        });
    }

    const sessionId = String(req.query.session_id || "").trim();
    const profileId = String(req.query.profile_id || "").trim();

    if (!sessionId || !profileId) {
        return res.status(400).json({ paid: false, error: "Missing session_id or profile_id." });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const isPaid = session.payment_status === "paid";
        const isProfileMatch = String(session.metadata?.profile_id || "") === profileId;

        return res.json({
            paid: isPaid && isProfileMatch
        });
    } catch (error) {
        return res.status(500).json({ paid: false, error: "Unable to verify payment." });
    }
});

app.use((req, res, next) => {
    const publicPagePaths = new Set(["/", "/index.html", "/regis.html", "/report.html"]);
    if (!publicPagePaths.has(req.path)) {
        return next();
    }

    const token = getValidAdminSessionToken(req);
    if (!token) {
        return next();
    }

    setAdminCookie(res, token);
    return res.redirect("/admin.html");
});

app.use(express.static(path.join(__dirname)));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Liberia Date server running on http://localhost:${PORT}`);
});
