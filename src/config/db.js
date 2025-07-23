const mongoose = require('mongoose');

async function main() {
    await mongoose.connect('mongodb+srv://vishal:lodhi04@cluster0.b9osdwu.mongodb.net/Leetcode')
}

module.exports = main;


