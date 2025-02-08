// Import Sentry voor CommonJS
const Sentry = require("@sentry/node");
const express = require("express");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

// Laad .env bestand voor omgevingsvariabelen
dotenv.config();

// Initialiseer Prisma en Sentry
const prisma = new PrismaClient();

// Sentry initialisatie met je DSN
Sentry.init({
  dsn: "https://49704ae434f2e2fd1486fb5ce95b4fae@o4508782577319936.ingest.de.sentry.io/4508782582890576",
});

// Maak de Express app aan
const server = express();  // We hebben 'app' veranderd naar 'server'
server.use(express.json()); // Voor het parsen van JSON-body's

// Middleware voor foutopsporing met Sentry
server.use(Sentry.Handlers.requestHandler());

// ------------------- Login Route -------------------
// Route om in te loggen en een JWT-token te verkrijgen
server.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Zoek gebruiker op via email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Controleer of de gebruiker bestaat
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Vergelijk het ingevoerde wachtwoord met het opgeslagen wachtwoord
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Genereer een JWT-token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.AUTH_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    Sentry.captureException(error); // Log de fout naar Sentry
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Middleware voor JWT verificatie -------------------
// Middleware om JWT-token te verifiëren voor beveiligde routes
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bijvoorbeeld: "Bearer <token>"

  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }

  // Verifieer het token
  jwt.verify(token, process.env.AUTH_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded; // Voeg de gedecodeerde informatie toe aan de request
    next();
  });
};

// ------------------- Gebruikersroutes -------------------
// Haal alle gebruikers op
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

// Maak een nieuwe gebruiker aan
server.post("/users", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Versleutel het wachtwoord
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

// ------------------- Bookings routes -------------------
// Haal alle boekingen op
server.get("/bookings", verifyToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany();
    res.json(bookings);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Haal een specifieke boeking op
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

// Maak een nieuwe boeking aan
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

// Werk een bestaande boeking bij
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

// Verwijder een boeking
server.delete("/bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.status(204).send(); // 204 betekent "No Content"
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------- Foutafhandelingsmiddleware -------------------
// Foutafhandelingsmiddleware voor Sentry
server.use(Sentry.Handlers.errorHandler());

// Algemene foutafhandelingsmiddleware
server.use((err, req, res, next) => {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

// ------------------- Server opstarten -------------------
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server draait op poort ${port}`);
});
