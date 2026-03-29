import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clinicsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/clinics", async (_req, res) => {
  const clinics = await db.select().from(clinicsTable);
  res.json(clinics);
});

export default router;
