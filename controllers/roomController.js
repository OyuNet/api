const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Generates a random room code consisting of uppercase letters, digits, and a length of 20.
 *
 * @return {string} The randomly generated room code.
 */
function generateRoomCode() {
    let roomCode = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 20; i++) {
        roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomCode;
}

/**
 * Creates a new room and adds the user to it.
 *
 * @param {Object} req - The request object containing the user ID.
 * @param {Object} res - The response object used to send the created room ID.
 * @return {Promise<void>} - Resolves with the created room ID if successful, or an error message if room creation fails.
 */
exports.createRoom = async (req, res) => {
    try {
        const roomId = generateRoomCode();
        const { userId } = req.body;

        const roomData = await db.get(`rooms.${roomId}`);
        if (roomData) {
            const room = JSON.parse(roomData);
            if (room.users.includes(userId)) {
                return res.status(409).json({ error: 'User already in room' });
            }
        }

        await db.set(`rooms.${roomId}`, JSON.stringify({ users: [userId], messages: [] }));

        res.status(201).json({ roomId: roomId });
    } catch (error) {
        res.status(404).json({ error: "Room creation failed" });
    }
};

/**
 * Joins a user to a room.
 *
 * @param {Object} req - The request object containing the room ID and user ID.
 * @param {Object} res - The response object used to send the result of the join operation.
 * @return {Promise<void>} - Resolves with a JSON response indicating the success of the join operation.
 */
exports.joinRoom = async (req, res) => {
    const { roomId, userId } = req.body;

    const roomData = await db.get(`rooms.${roomId}`);
    if (!roomData) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const room = JSON.parse(roomData);
    if (room.users.includes(userId)) {
        return res.status(409).json({ error: 'User already in room' });
    }

    room.users.push(userId);
    await db.set(`rooms.${roomId}`, JSON.stringify(room));

    res.status(200).json({ message: 'Joined room successfully' });
};

/**
 * Leaves a user from a room.
 *
 * @param {Object} req - The request object containing the room ID and user ID.
 * @param {Object} res - The response object used to send the result of the leave operation.
 * @return {Promise<void>} - Resolves with a JSON response indicating the success of the leave operation.
 */
exports.leaveRoom = async (req, res) => {
    const { roomId, userId } = req.body;

    const roomData = await db.get(`rooms.${roomId}`);
    if (!roomData) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const room = JSON.parse(roomData);
    room.users = room.users.filter(id => id !== userId);
    await db.set(`rooms.${roomId}`, JSON.stringify(room));

    res.status(200).json({ message: 'Left room successfully' });
};

/**
 * Sends a message to a room.
 *
 * @param {Object} req - The request object containing the room ID, user ID, and message.
 * @param {Object} res - The response object used to send the result of the message sending operation.
 * @return {Promise<void>} - Resolves with a JSON response indicating the success of the message sending operation.
 */
exports.sendMessage = async (req, res) => {
    const { roomId, userId, message } = req.body;

    try {
        const roomData = await db.get(`rooms.${roomId}`);

        if (!roomData) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const room = JSON.parse(roomData);
        if (!room.users.includes(userId)) {
            return res.status(403).json({ error: 'User not in room' });
        }

        const encryptedMessage = await encrypt(message);
        room.messages.push({ userId, message: encryptedMessage });
        await db.set(`rooms.${roomId}`, JSON.stringify(room));
        global.io.to(roomId).emit('newMessage', { sender: userId, message: encryptedMessage });
        return res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Message sending failed', error);
        return res.status(500).json({ error: 'Message sending failed' });
    }
};

/**
 * Retrieves the messages from a specific room.
 *
 * @param {Object} req - The request object containing the room ID.
 * @param {Object} res - The response object used to send the messages.
 * @return {Promise<void>} - Resolves with a JSON response containing the messages.
 */
exports.getMessages = async (req, res) => {
    const { roomId } = req.params;

    const roomData = await db.get(`rooms.${roomId}`);
    if (!roomData) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const room = JSON.parse(roomData);

    const messages = await Promise.all(
        room.messages.map(async message => ({
            userId: message.userId,
            message: await decrypt(message.message)
        }))
    );

    res.status(200).json({ messages });
};
