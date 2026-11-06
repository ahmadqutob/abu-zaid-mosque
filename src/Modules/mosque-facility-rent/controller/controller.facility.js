import mongoose from "mongoose";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import Facility from "../../../../database/Models/facility.model.js";
import FacilityScheduleLock from "../../../../database/Models/facilityScheduleLock.model.js";

const BLOCKING_STATUSES = ["pending", "approved"];
const HOURLY_RATE_USD = 20;
// A single server-assigned resource key prevents clients from bypassing overlap checks.
const SINGLE_FACILITY_ID = new mongoose.Types.ObjectId("000000000000000000000001");
const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["cancelled", "completed"],
  rejected: [],
  cancelled: [],
  completed: [],
};
let scheduleLockIndexesReady;

const overlapFilter = ({ start, end, excludeId }) => ({
  status: { $in: BLOCKING_STATUSES },
  ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  startDate: { $lt: end },
  endDate: { $gt: start },
});

export const calculateRentPrice = (start, end) =>
  Math.round((((end - start) / (60 * 60 * 1000)) * HOURLY_RATE_USD + Number.EPSILON) * 100) / 100;

/**
 * Serialize schedule changes for a facility across all API instances.
 * The lock document write is held inside a MongoDB transaction, so concurrent
 * transactions for the same facility conflict and retry before rechecking.
 */
const withFacilityScheduleLocks = async (facilityIds, callback) => {
  const ids = [...new Set(facilityIds.map((id) => String(id)))].sort();
  scheduleLockIndexesReady ??= FacilityScheduleLock.createIndexes();
  await scheduleLockIndexesReady;

  for (const facilityId of ids) {
    try {
      await FacilityScheduleLock.updateOne(
        { facilityId },
        { $setOnInsert: { facilityId, revision: 0 } },
        { upsert: true }
      );
    } catch (error) {
      // Another request may have created this unique lock document at once.
      if (error.code !== 11000) throw error;
    }
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      for (const facilityId of ids) {
        await FacilityScheduleLock.updateOne(
          { facilityId },
          { $inc: { revision: 1 } },
          { session }
        );
      }
      result = await callback(session, ids);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const isActiveBookingConflict = ({ start, end, excludeId, session }) => {
  const query = Facility.findOne(overlapFilter({ start, end, excludeId }));
  return session ? query.session(session) : query;
};

// ─── 1. CREATE RENT REQUEST ───────────────────────────────────────────────────

/**
 * POST /facility/create
 * Creates a new facility rent request. Checks for schedule conflicts.
 */
export const createFacilityRent = asyncHandler(async (req, res, next) => {
  const { renterName, renterPhone, eventType, startDate, endDate } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const result = await withFacilityScheduleLocks([SINGLE_FACILITY_ID], async (session) => {
    const conflict = await isActiveBookingConflict({ start, end, session });
    if (conflict) return { conflict: true };

    const rentRequest = new Facility({
      facilityId: SINGLE_FACILITY_ID,
      renterName,
      renterPhone,
      eventType,
      startDate: start,
      endDate: end,
      totalPrice: calculateRentPrice(start, end),
      hourlyRate: HOURLY_RATE_USD,
      extraCharge: 0,
      status: "pending",
    });
    await rentRequest.save({ session });
    return { rentRequest };
  });

  if (result.conflict) {
    return res.status(409).json({
      success: false,
      message: "Facility is already booked for the selected date range.",
    });
  }

  return res.status(201).json({
    success: true,
    message: "Facility rent request created successfully",
    data: result.rentRequest,
  });
});

// ─── 2. LIST ALL RENT REQUESTS ────────────────────────────────────────────────

/**
 * GET /facility/all
 * Lists all rent requests with pagination, filtering & search.
 */
export const getAllFacilityRents = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    facilityId,
    search,
    sort = "-createdAt",
  } = req.query;

  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = {};

  if (status) filter.status = status;
  if (facilityId) filter.facilityId = facilityId;

  if (search) {
    filter.$or = [
      { renterName: { $regex: search, $options: "i" } },
      { renterPhone: { $regex: search, $options: "i" } },
      { eventType: { $regex: search, $options: "i" } },
    ];
  }

  const [rents, total] = await Promise.all([
    Facility.find(filter)
      .populate("reviewerId", "userName email role")
      .sort(sort)
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Facility.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit),
    },
    data: rents,
  });
});

// ─── 3. GET DETAILS OF SPECIFIC RENT ──────────────────────────────────────────

/**
 * GET /facility/:id
 * Fetches single facility rent details by ObjectId.
 */
export const getFacilityRentById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rent = await Facility.findById(id).populate("reviewerId", "userName email role");

  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  return res.status(200).json({ success: true, data: rent });
});

// ─── 4. UPDATE RENT DETAILS BEFORE APPROVAL ───────────────────────────────────

/**
 * PUT /facility/update/:id
 * Updates rent details before approval.
 */
export const updateFacilityRent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const editableFields = ["renterName", "renterPhone", "eventType", "startDate", "endDate", "extraCharge", "paid"];
  const updateData = Object.fromEntries(
    editableFields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );

  const existingRent = await Facility.findById(id).select("facilityId");
  if (!existingRent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const result = await withFacilityScheduleLocks(
    [SINGLE_FACILITY_ID],
    async (session) => {
      const rent = await Facility.findById(id).session(session);
      if (!rent) return { notFound: true };

      if (rent.status !== "pending") return { status: rent.status };

      const start = new Date(updateData.startDate || rent.startDate);
      const end = new Date(updateData.endDate || rent.endDate);
      if (!(start < end)) return { invalidRange: true };

      const scheduleChanged =
        updateData.startDate !== undefined ||
        updateData.endDate !== undefined;

      if (scheduleChanged) {
        const conflict = await isActiveBookingConflict({
          start,
          end,
          excludeId: id,
          session,
        });
        if (conflict) return { conflict: true };
      }

      Object.assign(rent, updateData, {
        facilityId: SINGLE_FACILITY_ID,
        hourlyRate: HOURLY_RATE_USD,
        startDate: start,
        endDate: end,
        totalPrice: calculateRentPrice(start, end),
      });
      await rent.save({ session });
      return { rent };
    }
  );

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }
  if (result.status) {
    return res.status(400).json({
      success: false,
      message: `Cannot update rent details because request is already ${result.status}`,
    });
  }
  if (result.invalidRange) {
    return res.status(400).json({
      success: false,
      message: "End date must be after start date.",
    });
  }
  if (result.conflict) {
    return res.status(409).json({
      success: false,
      message: "Facility is already booked for the updated date range.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Rent details updated successfully",
    data: result.rent,
  });
});

// ─── 5. PATCH REQUEST FOR STATUS ──────────────────────────────────────────────

/**
 * PATCH /facility/:id/status
 * Changes status (pending → approved / rejected / cancelled).
 */
export const changeFacilityRentStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, reviewerNote } = req.body;

  const existingRent = await Facility.findById(id).select("facilityId");
  if (!existingRent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const result = await withFacilityScheduleLocks([SINGLE_FACILITY_ID], async (session) => {
    const rent = await Facility.findById(id).session(session);
    if (!rent) return { notFound: true };
    if (rent.status !== status && !ALLOWED_STATUS_TRANSITIONS[rent.status]?.includes(status)) {
      return { invalidTransition: rent.status };
    }

    if (BLOCKING_STATUSES.includes(status)) {
      const conflict = await isActiveBookingConflict({
        start: rent.startDate,
        end: rent.endDate,
        excludeId: rent._id,
        session,
      });
      if (conflict) return { conflict: true };
    }

    if (status === "completed" && rent.endDate > new Date()) return { futureCompletion: true };

    rent.status = status;
    if (req.user?._id) rent.reviewerId = req.user._id;
    if (reviewerNote !== undefined) rent.reviewerNote = reviewerNote;
    await rent.save({ session });
    return { rent };
  });

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }
  if (result.invalidTransition) {
    return res.status(400).json({
      success: false,
      message: `Cannot change rent status from "${result.invalidTransition}" to "${status}".`,
    });
  }
  if (result.conflict) {
    return res.status(409).json({
      success: false,
      message: "Cannot activate this rent because the facility is already booked for that date range.",
    });
  }
  if (result.futureCompletion) {
    return res.status(400).json({ success: false, message: "A rent cannot be completed before its end date." });
  }

  return res.status(200).json({
    success: true,
    message: `Facility rent status updated to "${status}"`,
    data: result.rent,
  });
});

// ─── 6. DELETE A RENT ─────────────────────────────────────────────────────────

/**
 * DELETE /facility/delete/:id
 * Deletes a rent request record.
 */
export const deleteFacilityRent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const existingRent = await Facility.findById(id).select("facilityId");
  if (!existingRent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const deleted = await withFacilityScheduleLocks([SINGLE_FACILITY_ID], async (session) => {
    const rent = await Facility.findById(id).session(session);
    if (!rent) return { notFound: true };
    await rent.deleteOne({ session });
    return { deleted: true };
  });

  if (deleted.notFound) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Facility rent request deleted successfully",
  });
});

// ─── 7. GENERATE INVOICE ──────────────────────────────────────────────────────

/**
 * GET /facility/:id/invoice
 * Generates invoice breakdown for a specific rent request.
 */
export const generateInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rent = await Facility.findById(id).populate("reviewerId", "userName email");
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const durationMs = new Date(rent.endDate) - new Date(rent.startDate);
  const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
  const hourlyRate = rent.hourlyRate ?? HOURLY_RATE_USD;
  const grandTotal = Math.round(((rent.totalPrice || 0) + (rent.extraCharge || 0) + Number.EPSILON) * 100) / 100;

  const invoice = {
    invoiceNumber: `INV-FAC-${rent._id.toString().slice(-6).toUpperCase()}`,
    issuedAt: new Date(),
    renter: {
      name: rent.renterName,
      phone: rent.renterPhone,
    },
    event: {
      type: rent.eventType,
      startDate: rent.startDate,
      endDate: rent.endDate,
      durationInHours: durationHours,
    },
    pricing: {
      hourlyRate,
      basePrice: rent.totalPrice,
      extraCharge: rent.extraCharge || 0,
      grandTotal,
      paid: rent.paid,
      paymentStatus: rent.paid ? "PAID" : "UNPAID",
    },
    status: rent.status,
    reviewer: rent.reviewerId
      ? { name: rent.reviewerId.userName, email: rent.reviewerId.email }
      : null,
  };

  return res.status(200).json({ success: true, data: invoice });
});

// ─── 8. LIST ALL PAYMENTS FOR A RENT ──────────────────────────────────────────

/**
 * GET /facility/:id/payments
 * Fetches payment details/breakdown for a rent.
 */
export const listFacilityPayments = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rent = await Facility.findById(id);
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const grandTotal = Math.round(((rent.totalPrice || 0) + (rent.extraCharge || 0) + Number.EPSILON) * 100) / 100;

  const paymentSummary = {
    rentId: rent._id,
    renterName: rent.renterName,
    renterPhone: rent.renterPhone,
    basePrice: rent.totalPrice,
    extraCharge: rent.extraCharge || 0,
    grandTotal,
    paid: rent.paid,
    paymentStatus: rent.paid ? "PAID" : "UNPAID",
    rentStatus: rent.status,
  };

  return res.status(200).json({ success: true, data: paymentSummary });
});

// ─── 9. CHECK IF FACILITY IS FREE FOR DATE RANGE ──────────────────────────────

/**
 * GET /facility/check-availability
 * Checks if a facility is available for a given start and end date range.
 */
export const checkFacilityAvailability = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflictingBookings = await Facility.find(overlapFilter({ start, end }))
    .select("startDate endDate status");

  const isAvailable = conflictingBookings.length === 0;

  return res.status(200).json({
    success: true,
    available: isAvailable,
    conflictingBookingsCount: conflictingBookings.length,
    conflicts: conflictingBookings,
    message: isAvailable
      ? "Facility is available for the requested date range."
      : "Facility is not available for the requested date range.",
  });
});

// ─── 10. MARK RENT COMPLETED ──────────────────────────────────────────────────

/**
 * PATCH /facility/:id/complete
 * Marks rent request status as completed.
 */
export const markRentCompleted = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const existingRent = await Facility.findById(id).select("facilityId");
  if (!existingRent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  const result = await withFacilityScheduleLocks([SINGLE_FACILITY_ID], async (session) => {
    const rent = await Facility.findById(id).session(session);
    if (!rent) return { notFound: true };
    if (rent.status !== "approved") return { invalidStatus: rent.status };
    if (rent.endDate > new Date()) return { futureCompletion: true };

    rent.status = "completed";
    await rent.save({ session });
    return { rent };
  });

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }
  if (result.invalidStatus) {
    return res.status(400).json({
      success: false,
      message: `Only approved rent requests can be marked completed. Current status is ${result.invalidStatus}.`,
    });
  }
  if (result.futureCompletion) {
    return res.status(400).json({ success: false, message: "A rent cannot be completed before its end date." });
  }

  return res.status(200).json({
    success: true,
    message: "Rent request marked as completed.",
    data: result.rent,
  });
});
