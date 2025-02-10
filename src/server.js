// Import Sentry for ES Modules
import * as Sentry from "@sentry/node";
import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

// Load .env file for environment variables
dotenv.config();

// Initialize Prisma and Sentry
const prisma = new PrismaClient();

// Sentry initialization with your DSN
Sentry.init({
  dsn: process.env.SENTRY_DSN, // Maak de DSN een environment variable
});

// Create the Express app
const server = express();
server.use(express.json()); // For parsing JSON bodies

// Middleware for error tracking with Sentry
server.use(Sentry.Handlers.requestHandler());

// ------------------- Eenvoudige Root Route -------------------
// Add a simple root route to check if the server is running
server.get("/", (req, res) => {
  res.send("Server is running!"); // This message will appear at http://localhost:3000/
});

// ------------------- Login Route -------------------
// Route to login and obtain a JWT token
server.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the entered password with the stored password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.AUTH_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    Sentry.captureException(error); // Log the error to Sentry
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Middleware for JWT verification -------------------
// Middleware to verify JWT token for protected routes
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Example: "Bearer <token>"

  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }

  // Verify the token
  jwt.verify(token, process.env.AUTH_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded; // Attach decoded info to the request
    next();
  });
};

// ------------------- User Routes -------------------
// Get all users
server.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true },
    });
    res.json(users);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new user
server.post("/users", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Booking Routes -------------------
// Get all bookings
server.get("/bookings", verifyToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany();
    res.json(bookings);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific booking by ID
server.get("/bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new booking
server.post("/bookings", verifyToken, async (req, res) => {
  const { checkInDate, checkOutDate, userId, propertyId } = req.body;
  try {
    const newBooking = await prisma.booking.create({
      data: {
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        userId,
        propertyId,
      },
    });
    res.status(201).json(newBooking);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an existing booking
server.put("/bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { checkInDate, checkOutDate } = req.body;
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
      },
    });
    res.json(updatedBooking);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a booking
server.delete("/bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.status(204).send(); // 204 means "No Content"
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Error Handling Middleware -------------------
// Sentry error handling middleware
server.use(Sentry.Handlers.errorHandler());

// General error handling middleware
server.use((err, req, res, next) => {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

// ------------------- Start the server -------------------
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
