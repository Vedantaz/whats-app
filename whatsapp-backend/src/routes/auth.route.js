import express from "express";
import { checkAuth, login, logout, signup, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
<<<<<<< HEAD
=======
import upload from '../middleware/upload.js'
>>>>>>> backend

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

<<<<<<< HEAD
router.put("/update-profile", protectRoute, updateProfile);
=======
router.put("/update-profile",upload.single('profilePic'), protectRoute, updateProfile);
>>>>>>> backend

router.get("/check", protectRoute, checkAuth);

export default router;
