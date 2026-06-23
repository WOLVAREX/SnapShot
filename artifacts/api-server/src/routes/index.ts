import { Router, type IRouter } from "express";
import healthRouter from "./health";
import screenshotsRouter from "./screenshots";
import pagesRouter from "./pages";
import videosRouter from "./videos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(screenshotsRouter);
router.use(pagesRouter);
router.use(videosRouter);

export default router;
