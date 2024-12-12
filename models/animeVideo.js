const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const animationVideoSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        artist: {
            type: String,
            default: 'Unknown',
        },
        genre: {
            type: String,
            default: 'General',
        },
        tags: {
            type: [String], // Array of strings
            default: [],
        },
        duration: {
            type: Number, // Video duration in seconds
            default: 0,
        },
        file: {
            data: Buffer, // Binary data for the video
            contentType: String, // MIME type of the video
        },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

const AnimationVideo = mongoose.model('AnimationVideo', animationVideoSchema);

module.exports = AnimationVideo;