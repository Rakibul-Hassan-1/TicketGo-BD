import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { generateForSchedule } from "../jobs/recurrence.job";
import { RecurringSchedule } from "../models/RecurringSchedule";
import { sendError, sendSuccess } from "../utils/apiResponse";

export const createRecurring = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body?.route?.distance && body?.route?.distance !== 0) {
      sendError(res, "Route distance is required", 400);
      return;
    }
    const recurrenceId = uuidv4();
    const doc = await RecurringSchedule.create({ ...body, recurrenceId });

    await generateForSchedule(doc._id.toString(), 30);

    sendSuccess(
      res,
      { recurring: doc },
      "Recurring schedule created and generated",
    );
  } catch (err: any) {
    sendError(res, err?.message || "Failed to create recurring schedule", 500);
  }
};

export const listRecurrings = async (_req: Request, res: Response) => {
  try {
    const list = await RecurringSchedule.find().populate(
      "bus",
      "busName busNumber",
    );
    sendSuccess(res, { list }, "Recurrings fetched");
  } catch (err: any) {
    sendError(res, err?.message || "Failed to list recurrings", 500);
  }
};

export const getRecurring = async (req: Request, res: Response) => {
  try {
    const doc = await RecurringSchedule.findById(req.params.id).populate(
      "bus",
      "busName",
    );
    if (!doc) return sendError(res, "Not found", 404);
    sendSuccess(res, { recurring: doc }, "Fetched");
  } catch (err: any) {
    sendError(res, err?.message || "Failed to get recurring", 500);
  }
};

export const updateRecurring = async (req: Request, res: Response) => {
  try {
    const doc = await RecurringSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    if (!doc) return sendError(res, "Not found", 404);
    sendSuccess(res, { recurring: doc }, "Updated");
  } catch (err: any) {
    sendError(res, err?.message || "Failed to update recurring", 500);
  }
};

export const deleteRecurring = async (req: Request, res: Response) => {
  try {
    const doc = await RecurringSchedule.findByIdAndDelete(req.params.id);
    if (!doc) return sendError(res, "Not found", 404);
    sendSuccess(res, {}, "Deleted");
  } catch (err: any) {
    sendError(res, err?.message || "Failed to delete recurring", 500);
  }
};

export const applyRecurringNow = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const months = Number(req.query.months || 1);
    const days = months * 30;
    await generateForSchedule(id, days);
    sendSuccess(res, {}, "Generated instances for schedule");
  } catch (err: any) {
    sendError(res, err?.message || "Failed to apply recurring", 500);
  }
};
