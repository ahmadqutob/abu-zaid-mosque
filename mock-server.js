/**
 * Mock API Server for Frontend Testing
 * This server simulates the backend API without requiring MongoDB
 * Useful for testing frontend functionality during development
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Mock database
const users = new Map();
const bookings = new Map();
const posts = new Map();

// Generate mock token
const generateToken = (userId) => {
  return 'mock_token_' + userId + '_' + Date.now();
};

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes

// Auth Routes
app.post('/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  // Mock validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (email === 'test@example.com' && password === 'password123') {
    const token = generateToken('user123');
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: 'user123',
        email: 'test@example.com',
        userName: 'Test User'
      }
    });
  }

  // If email doesn't exist, pretend it does but password is wrong
  res.status(401).json({ message: 'Invalid email or password' });
});

app.post('/auth/signup', (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (users.has(email)) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const userId = 'user_' + Date.now();
  users.set(email, { id: userId, userName, email, password });

  res.status(201).json({
    message: 'Signup successful! Please check your email to confirm.',
    user: { id: userId, email, userName }
  });
});

// Booking Routes
app.post('/booking', (req, res) => {
  const bookingId = 'booking_' + Date.now();
  const booking = { id: bookingId, ...req.body };
  bookings.set(bookingId, booking);

  res.status(201).json({
    message: 'Booking created successfully',
    booking
  });
});

app.get('/booking', (req, res) => {
  const allBookings = Array.from(bookings.values());
  res.json({ bookings: allBookings });
});

// Posts Routes
app.post('/post', (req, res) => {
  const postId = 'post_' + Date.now();
  const post = { id: postId, ...req.body };
  posts.set(postId, post);

  res.status(201).json({
    message: 'Post created successfully',
    post
  });
});

app.get('/post', (req, res) => {
  const allPosts = Array.from(posts.values());
  res.json({ posts: allPosts });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Mock API Server is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Mock API Server running on port ${port}`);
  console.log(`📝 Test credentials: email: test@example.com, password: password123`);
  console.log(`✅ CORS enabled for http://localhost:5173`);
  console.log(`🔗 API Health Check: http://localhost:${port}/health`);
});
