const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const audioSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        artist: { type: String }, // Optional: Artist or creator name
        genre: { type: String }, // Optional: Genre of the audio file
        file: {
            data: Buffer, // Store binary data
            contentType: String, // MIME type, e.g., 'audio/mpeg'
        },
        duration: { type: Number }, // Duration in seconds
        format: { type: String }, // File format, e.g., 'mp3', 'wav'
        plays: { type: Number, default: 0 }, // Tracks the number of plays
        likes: { type: Number, default: 0 }, // Tracks likes or favorites
        tags: [{ type: String }], // Optional: Array of tags
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

const Audio1 = mongoose.model('Audio1', audioSchema);
module.exports = Audio1;