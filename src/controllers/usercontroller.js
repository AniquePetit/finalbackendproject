// controllers/userController.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // Zorg ervoor dat bcrypt geïmporteerd is
import * as Sentry from '@sentry/node';  // Zorg ervoor dat Sentry correct is geïmporteerd
const prisma = new PrismaClient();

// Maak een nieuwe gebruiker aan
export const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Check of alle vereiste velden aanwezig zijn
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email en password zijn verplicht' });
  }

  try {
    // Controleer of de gebruiker al bestaat
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is al in gebruik' });
    }

    // Hash het wachtwoord
    const hashedPassword = await bcrypt.hash(password, 10);

    // Maak de nieuwe gebruiker aan
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || 'guest',  // Default rol 'guest' als geen rol wordt meegegeven
      },
    });

    // Stuur de response terug zonder het wachtwoord
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    // Stuur de fout door naar Sentry voor logging
    Sentry.captureException(error);
    res.status(500).json({ message: 'Er is iets misgegaan bij het aanmaken van de gebruiker' });
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
    // Stuur de fout door naar Sentry voor logging
    Sentry.captureException(error);
    res.status(500).json({ message: 'Er is iets misgegaan bij het ophalen van de gebruikers' });
  }
};
