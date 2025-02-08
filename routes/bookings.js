import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middleware/auth.js"; // Zorg ervoor dat je deze middleware al hebt gemaakt.

const router = express.Router();
const prisma = new PrismaClient();

// Haal alle boekingen op
router.get("/", verifyToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Haal een specifieke boeking op
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Maak een nieuwe boeking aan
router.post("/", verifyToken, async (req, res) => {
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
    res.status(500).json({ message: "Server error" });
  }
});

// Werk een bestaande boeking bij
router.put("/:id", verifyToken, async (req, res) => {
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
    res.status(500).json({ message: "Server error" });
  }
});

// Verwijder een boeking
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.status(204).send(); // 204 betekent "No Content"
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
