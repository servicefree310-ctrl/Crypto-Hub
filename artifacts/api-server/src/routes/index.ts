import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import healthRouter from "./health";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(userRouter);

export default router;
