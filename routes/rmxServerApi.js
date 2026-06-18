const express = require("express");
const router = express.Router();
const User = require("../model/user.js");
const Friends = require("../model/friends.js");
const jwt = require("jsonwebtoken");
const functions = require("../structs/functions.js");

// Track connected players (simple in-memory for now)
let onlinePlayers = new Set();
let discordAuthStates = new Map(); // state -> { pending: boolean, data?: any }

// Endpoint to get player count
router.get("/rmx/server/api/v1/clients", async (req, res) => {
    try {
        // For now, return a simple count (we can enhance this later)
        res.send(onlinePlayers.size.toString());
    } catch (err) {
        console.error("[Player Count] Error:", err);
        res.status(500).send("0");
    }
});

// Endpoint to get friends
router.get("/rmx/server/api/v1/friends/:accountId", async (req, res) => {
    try {
        const { accountId } = req.params;
        
        const friendsDoc = await Friends.findOne({ accountId });
        if (!friendsDoc) {
            return res.json([]);
        }

        const friendAccountIds = friendsDoc.list.accepted || [];
        const friendUsers = await User.find({ accountId: { $in: friendAccountIds } });

        const friendsList = friendUsers.map(user => ({
            accountId: user.accountId,
            displayName: user.username,
            profilePicture: user.avatar,
            online: onlinePlayers.has(user.accountId),
            status: "Online"
        }));

        res.json(friendsList);
    } catch (err) {
        console.error("[Friends API] Error:", err);
        res.status(500).json([]);
    }
});

// Endpoint for Discord auth initial request
router.get("/rmx/server/api/v1/discord/auth", async (req, res) => {
    try {
        const state = functions.MakeID(16);
        discordAuthStates.set(state, { pending: true });

        // For now, we'll just return a placeholder, but in a real implementation
        // you'd redirect to Discord OAuth2
        res.json({ 
            success: true, 
            state,
            authUrl: `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=identify%20email&state=${state}`
        });
    } catch (err) {
        console.error("[Discord Auth] Error:", err);
        res.status(500).json({ success: false, error: "Failed to initiate auth" });
    }
});

// Endpoint to poll for Discord auth completion
router.get("/rmx/server/api/v1/discord/pending/:state", async (req, res) => {
    try {
        const { state } = req.params;
        const authData = discordAuthStates.get(state);

        if (!authData) {
            return res.json({ pending: false, error: "Invalid state" });
        }

        if (authData.pending) {
            return res.json({ pending: true });
        }

        // If auth is complete, return the data
        res.json({
            pending: false,
            token: authData.token,
            user: authData.user
        });

        // Clean up
        discordAuthStates.delete(state);
    } catch (err) {
        console.error("[Discord Pending] Error:", err);
        res.status(500).json({ pending: false, error: "Server error" });
    }
});

// Friends summary endpoint
router.get("/friends/api/v1/:accountId/summary", async (req, res) => {
    try {
        const { accountId } = req.params;
        const friendsDoc = await Friends.findOne({ accountId });
        
        if (!friendsDoc) {
            return res.json({
                outgoing: [],
                incoming: [],
                accepted: []
            });
        }

        res.json({
            outgoing: (friendsDoc.list.outgoing || []).map(id => ({ accountId: id })),
            incoming: (friendsDoc.list.incoming || []).map(id => ({ accountId: id })),
            accepted: (friendsDoc.list.accepted || []).map(id => ({ accountId: id }))
        });
    } catch (err) {
        console.error("[Friends Summary] Error:", err);
        res.status(500).json({ outgoing: [], incoming: [], accepted: [] });
    }
});

// Add friend endpoint
router.post("/friends/api/v1/:accountId/friends/:friendId", async (req, res) => {
    try {
        const { accountId, friendId } = req.params;

        // Update requester's outgoing list
        await Friends.findOneAndUpdate(
            { accountId },
            { $addToSet: { "list.outgoing": friendId } },
            { upsert: true, new: true }
        );

        // Update recipient's incoming list
        await Friends.findOneAndUpdate(
            { accountId: friendId },
            { $addToSet: { "list.incoming": accountId } },
            { upsert: true, new: true }
        );

        res.status(200).send();
    } catch (err) {
        console.error("[Add Friend] Error:", err);
        res.status(500).send();
    }
});

// Remove friend endpoint
router.delete("/friends/api/v1/:accountId/friends/:friendId", async (req, res) => {
    try {
        const { accountId, friendId } = req.params;

        // Remove from both users' accepted lists
        await Friends.findOneAndUpdate(
            { accountId },
            { $pull: { "list.accepted": friendId } }
        );
        await Friends.findOneAndUpdate(
            { accountId: friendId },
            { $pull: { "list.accepted": accountId } }
        );

        res.status(200).send();
    } catch (err) {
        console.error("[Remove Friend] Error:", err);
        res.status(500).send();
    }
});

// Search players endpoint
router.get("/api/v1/search/:accountId", async (req, res) => {
    try {
        const { accountId } = req.params;
        const { prefix } = req.query;

        if (!prefix) {
            return res.json([]);
        }

        const users = await User.find({
            username_lower: { $regex: `^${prefix.toLowerCase()}` },
            accountId: { $ne: accountId }
        }).limit(20);

        const results = users.map(user => ({
            accountId: user.accountId,
            matches: [{ value: user.username }],
            profile_picture: user.avatar
        }));

        res.json(results);
    } catch (err) {
        console.error("[Search Players] Error:", err);
        res.status(500).json([]);
    }
});

module.exports = router;
