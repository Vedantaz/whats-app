import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";
import User from "../models/user.model.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post('/fix-users', async (req, res)=>{
    try{
        const users = await User.find(
            {fullName : {$exists : false}}

        );
        let updateCount =0;

        //updating each user
        for(const user of users){
            user.fullName = user.username
            await user.save();
            updateCount++;

        }
        res.json({message:`Updated ${updateCount} users`});


    }catch(error){
        console.error("❌ Error updating users:", error);  // log the full error

        res.status(500).json({ 
          message: 'Error updating users', 
          error: error.message || error.toString()  // send readable error
        });
    }

});

router.post('/fix-remove-username', async (req, res) => {
    try {
      const result = await User.updateMany(
        { username: { $exists: true } }, // only where username exists
        { $unset: { username: "" } }     // remove username field
      );
  
      res.json({
        message: `✅ Removed username from ${result.modifiedCount} users`
      });
    } catch (error) {
      console.error("❌ Error removing username:", error);
      res.status(500).json({
        message: 'Error removing username field',
        error: error.message || error.toString()
      });
    }
  });
  

export default router;
