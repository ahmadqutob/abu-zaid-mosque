import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import Facility from "../../../../database/Models/facility.model.js";

// ─── 1. CREATE RENT REQUEST ───────────────────────────────────────────────────

/**
 * POST /facility/create
 * Creates a new facility rent request. Checks for schedule conflicts.
 */
export const createFacilityRent = asyncHandler(async (req, res, next) => {
  const { facilityId, renterName, renterPhone, eventType, startDate, endDate, totalPrice, extraCharge = 0 } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check for date range conflict with active/pending bookings
  const conflict = await Facility.findOne({
    facilityId,
    status: { $in: ["pending", "approved"] },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  if (conflict) {
    return res.status(400).json({
      success: false,
      message: "Facility is already booked for the selected date range.",
    });
  }

  const rentRequest = await Facility.create({
    facilityId,
    renterName,
    renterPhone,
    eventType,
    startDate: start,
    endDate: end,
    totalPrice,
    extraCharge,
    status: "pending",
  });

  return res.status(201).json({
    success: true,
    message: "Facility rent request created successfully",
    data: rentRequest,
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
  const updateData = { ...req.body };

  const rent = await Facility.findById(id);
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  if (rent.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Cannot update rent details because request is already ${rent.status}`,
    });
  }

  // If dates are being changed, re-verify availability
  if (updateData.startDate || updateData.endDate) {
    const start = new Date(updateData.startDate || rent.startDate);
    const end = new Date(updateData.endDate || rent.endDate);

    const conflict = await Facility.findOne({
      _id: { $ne: id },
      facilityId: updateData.facilityId || rent.facilityId,
      status: { $in: ["pending", "approved"] },
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } },
      ],
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Facility is already booked for the updated date range.",
      });
    }
  }

  const updatedRent = await Facility.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({
    success: true,
    message: "Rent details updated successfully",
    data: updatedRent,
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

  const rent = await Facility.findById(id);
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  rent.status = status;
  if (req.user?._id) rent.reviewerId = req.user._id;
  if (reviewerNote !== undefined) rent.reviewerNote = reviewerNote;

  await rent.save();

  return res.status(200).json({
    success: true,
    message: `Facility rent status updated to "${status}"`,
    data: rent,
  });
});

// ─── 6. DELETE A RENT ─────────────────────────────────────────────────────────

/**
 * DELETE /facility/delete/:id
 * Deletes a rent request record.
 */
export const deleteFacilityRent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rent = await Facility.findById(id);
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  await Facility.findByIdAndDelete(id);

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
  const durationHours = Math.max(1, Math.round(durationMs / (1000 * 60 * 60)));
  const grandTotal = (rent.totalPrice || 0) + (rent.extraCharge || 0);

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

  const grandTotal = (rent.totalPrice || 0) + (rent.extraCharge || 0);

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
  const { facilityId, startDate, endDate } = req.query;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflictingBookings = await Facility.find({
    facilityId,
    status: { $in: ["pending", "approved"] },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  }).select("renterName eventType startDate endDate status");

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

  const rent = await Facility.findById(id);
  if (!rent) {
    return res.status(404).json({ success: false, message: "Facility rent request not found" });
  }

  if (rent.status !== "approved") {
    return res.status(400).json({
      success: false,
      message: `Only approved rent requests can be marked completed. Current status is ${rent.status}.`,
    });
  }

  rent.status = "completed";
  await rent.save();

  return res.status(200).json({
    success: true,
    message: "Rent request marked as completed.",
    data: rent,
  });
});
