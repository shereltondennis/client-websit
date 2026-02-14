const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const CONTACT_UNLOCK_PRICE_CENTS = Number(process.env.CONTACT_UNLOCK_PRICE_CENTS || 300);
const CONTACT_UNLOCK_CURRENCY = (process.env.CONTACT_UNLOCK_CURRENCY || "usd").toLowerCase();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const uploadsDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

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
app.use(express.static(path.join(__dirname)));
app.use("/uploads", express.static(uploadsDir));

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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Liberia Date server running on http://localhost:${PORT}`);
});
