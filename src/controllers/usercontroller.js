// controllers/userController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Maak een nieuwe gebruiker aan
export const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
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
    res.status(500).json({ message: "Er is iets misgegaan" });
  }
};

// Haal alle gebruikers op
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true },
    });
    res.json(users);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: "Er is iets misgegaan" });
  }
};
