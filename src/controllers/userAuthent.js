const redisClient = require("../config/redis");
const User = require("../models/user");
const validate = require('../utils/validator');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const Submission = require("../models/submission");

// Shared cookie options for cross-site JWT cookie
const COOKIE_OPTS = {
  httpOnly: true,                               // no client-side JS access
  secure: process.env.NODE_ENV === 'production',// HTTPS only in prod
  sameSite: 'none',                             // allow cross-site (Netlify ↔ API)
  maxAge: 60 * 60 * 1000                        // 1 hour
};

// User Registration
const register = async (req, res) => {
  try {
    // Validate input
    validate(req.body);
    const { firstName, emailId, password } = req.body;

    // Hash password and set role
    req.body.password = await bcrypt.hash(password, 10);
    req.body.role = 'user';

    // Create user
    const user = await User.create(req.body);

    // Sign JWT
    const token = jwt.sign(
      { _id: user._id, emailId: user.emailId, role: 'user' }, 
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );

    // Send cookie + response
    res
      .cookie('token', token, COOKIE_OPTS)
      .status(201)
      .json({
        user: {
          firstName: user.firstName,
          emailId: user.emailId,
          _id: user._id,
          role: user.role,
        },
        message: 'Registered & logged in successfully'
      });
  } catch (err) {
    res.status(400).send("Error: " + err);
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      throw new Error("Invalid Credentials");
    }

    const user = await User.findOne({ emailId });
    if (!user) throw new Error("Invalid Credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid Credentials");

    // Sign JWT
    const token = jwt.sign(
      { _id: user._id, emailId: user.emailId, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );

    // Send cookie + response
    res
      .cookie('token', token, COOKIE_OPTS)
      .status(200)
      .json({
        user: {
          firstName: user.firstName,
          emailId: user.emailId,
          _id: user._id,
          role: user.role,
        },
        message: 'Logged in successfully'
      });
  } catch (err) {
    res.status(401).send("Error: " + err);
  }
};

// User Logout
const logout = async (req, res) => {
  try {
    const { token } = req.cookies;
    const payload = jwt.decode(token) || {};

    // Block token in Redis until it expires
    if (token) {
      await redisClient.set(`token:${token}`, 'blocked');
      if (payload.exp) {
        await redisClient.expireAt(`token:${token}`, payload.exp);
      }
    }

    // Clear cookie
    res
      .clearCookie('token', COOKIE_OPTS)
      .status(200)
      .json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(503).send("Error: " + err);
  }
};

// Admin Registration
const adminRegister = async (req, res) => {
  try {
    validate(req.body);
    const { firstName, emailId, password } = req.body;

    req.body.password = await bcrypt.hash(password, 10);

    const user = await User.create(req.body);

    const token = jwt.sign(
      { _id: user._id, emailId: user.emailId, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );

    res
      .cookie('token', token, COOKIE_OPTS)
      .status(201)
      .send("User Registered Successfully");
  } catch (err) {
    res.status(400).send("Error: " + err);
  }
};

// Delete Profile
const deleteProfile = async (req, res) => {
  try {
    const userId = req.result._id;
    await User.findByIdAndDelete(userId);
    // optionally delete submissions:
    // await Submission.deleteMany({ userId });

    res.status(200).send("Deleted Successfully");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { register, login, logout, adminRegister, deleteProfile };
