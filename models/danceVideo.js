const mongoose = require('mongoose');

const danceVideoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    choreographer: {
        type: String,
        trim: true,
    },
    genre: {
        type: String,
        trim: true,
    },
    tags: {
        type: [String], // Store tags as an array of strings
        default: [],
    },
    fileUrl: {
        type: String,
        required: true,
        trim: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now, // Automatically store the date of upload
    },
});

const DanceVideo = mongoose.model('DanceVideo', danceVideoSchema);

module.exports = DanceVideo;