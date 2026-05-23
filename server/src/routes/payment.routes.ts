import { Router } from "express";
import {
  downloadTicket,
  initiatePayment,
  paymentCancel,
  paymentFail,
  paymentIpn,
  paymentSuccess,
} from "../controllers/payment.controller";
import { protect } from "../middleware/auth";

const router = Router();

router.get("/tickets/:bookingId", downloadTicket);
router.post("/initiate", protect, initiatePayment);
router.post("/success", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);
router.post("/ipn", paymentIpn);

export default router;
