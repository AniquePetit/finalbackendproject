// routes/userRoutes.js
import express from "express";
import { createUser, getUsers } from "../controllers/userController";
import { verifyToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Route om een gebruiker aan te maken
router.post("/", createUser);

// Route om alle gebruikers op te halen (beveiligd met token)
router.get("/", verifyToken, getUsers);

export default router;
