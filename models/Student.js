const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
    suspended: {
        type: Boolean,
        required: true,
        default: false,
    },
});

module.exports = mongoose.model('Student', studentSchema);
