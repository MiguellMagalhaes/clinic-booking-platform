import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appointmentsRouter from "./appointments";
import clinicsRouter from "./clinics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appointmentsRouter);
router.use(clinicsRouter);

export default router;
