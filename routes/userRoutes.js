import express from "express";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.get("/users", userController.getUsers);

router.post("/users", userController.addUser);

router.put("/users/:id", userController.editUser);

router.put("/users/:id/reset-password", userController.resetUserPassword);

router.delete("/users/:id", userController.removeUser);
router.patch("/users/:id/activate", userController.activateUser);
router.patch("/users/:id/unactivate", userController.unActivateUser);

export default router;
