import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import Booking from "../../../../database/Models/booking.models.js";
import User from "../../../../database/Models/user.model.js";
import { sendEmail } from "../../../Services/SendEmail.services.js";
import { sendWhatsApp } from "../../../Services/sendWhatsapp.services.js";
import puppeteer from 'puppeteer';
// change time 19:18 to number 19*60 + 18
const toMinutes = (timeStr) => {
  const [h, m] = String(timeStr).split(":").map(Number);
  if (h < 0 || h > 23) throw new Error("Hours must be between 0 and 23");

  if (m < 0 || m > 59) throw new Error("Minutes must be between 0 and 59");
  return h * 60 + m;
};

 
//2025-08-12 [from start , to end date]
//bound=حدود
const getDayBounds = (dateOfRent_Str) => {
  const normalized = dateOfRent_Str.replaceAll("/", "-"); // allow both separators
  
  // Parse the date string and create Date object in local timezone
  const [year, month, day] = normalized.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day); // month is 0-indexed in JavaScript
  
  if (Number.isNaN(dayStart.getTime())) throw new Error("Invalid dateOfRent");

  dayStart.setHours(0, 0, 0, 0); // start of day in local timezone
  const dayEnd = new Date(dayStart); 
  dayEnd.setHours(23, 59, 59, 999); // end of day in local timezone
  return { dayStart, dayEnd };
};

const validateNotPastDate = (dayStart) => { // dayStart is object from getDayBounds function
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dayStart < todayStart) {
    const e = new Error("Date of rent must be today or in the future");
    e.statusCode = 400;
    throw e;
  }
};

// check endRentTime is not before startRentTime
const validateTimeOrder = (startRentTime, endRentTime) => {
  const s = toMinutes(startRentTime);
  const e = toMinutes(endRentTime);
  if (e <= s) {
    const err = new Error("End time must be after start time");
    err.statusCode = 400;
    throw err;
  }
};

// check time should be is the future
const validateNotPastTimeToday = (dayStart, startRentTime) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isToday = dayStart.getTime() === todayStart.getTime();
  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = toMinutes(startRentTime);
    if (startMinutes < currentMinutes) {
      const e = new Error("Start time must be in the future (cannot book past time today)");
      e.statusCode = 400;
      throw e;
    }
  }
};

// convert minutes to hours for caculate the price per hour 
const calculateDurationHours = (startRentTime, endRentTime) => {
  const startRentTime_min = toMinutes(startRentTime);
  const endRentTime_min = toMinutes(endRentTime);
  return (endRentTime_min - startRentTime_min) / 60; // convert minutes -> hours
};

const calculatePrice = (durationHours, pricePerHour = 70) => {
  return Math.round(Number(durationHours) * pricePerHour * 100) / 100; // round to 2 decimals
};

//Ensures the minimum is 1 point, even if the booking is less than 1 hour.
const calculatePoints = (durationHours) => {
  const points = Math.max(1, Math.round(durationHours)); //0.8 hour -> 1 hour 
  return points;
};

export const createBooking = asyncHandler(async (req, res, next) => {
  // Auth required: visitors must sign up (as "user") before booking.
  const userID = req.user._id;
  const {
    renterName,
    renterPhone,
    renterEmail,
    dateOfRent,
    startRentTime,
    endRentTime,
    anyComment,
    eventType,
    attendeesCount,
  } = req.body;

  // 1) Day bounds [from start ,to end day]
  const { dayStart, dayEnd } = getDayBounds(dateOfRent);

  // 2) Date not in past
  validateNotPastDate(dayStart);

  // 3)check if  EndRentTime > StartRentTime
  validateTimeOrder(startRentTime, endRentTime);

  // 4) If booking today, start must be >= now and should be in the future
  validateNotPastTimeToday(dayStart, startRentTime);

  // 5) Check overlaps (same field or global if single field)
  const match = {
    dateOfRent: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: "cancelled" },
  };
  const sameDay = await Booking.find(match).lean();

  const newStart = toMinutes(startRentTime);
  const newEnd = toMinutes(endRentTime);

  const conflict = sameDay.find((b) => {
    const bStart = toMinutes(b.startRentTime);
    const bEnd = toMinutes(b.endRentTime);
    return !(newEnd <= bStart || newStart >= bEnd); // overlap
  });

  if (conflict) {
    return res.status(409).json({
      message: "Time slot not available",
      conflict: {
        dateOfRent: conflict.dateOfRent,
        startRentTime: conflict.startRentTime,
        endRentTime: conflict.endRentTime,
      },
    });
  }

  // 6) Calculate duration & price
  const durationHours = calculateDurationHours(startRentTime, endRentTime); //convert min to hour
  const pricePerHour = 70;
  const totalPrice = calculatePrice(durationHours, pricePerHour); //calculate the price per hour

  // 7) Create booking
  const created = await Booking.create({
    userId: userID,
    renterName,
    renterPhone,
    renterEmail,
    eventType,
    attendeesCount,
    dateOfRent: dayStart, // store normalized date
    startRentTime,
    endRentTime,
    durationHours,
    pricePerHour,
    totalPrice,
    anyComment,
    status: "pending",
  });

  // 8) Award loyalty points to the booker
  const pointsEarned = calculatePoints(durationHours);
  await User.findByIdAndUpdate(
    userID,
    { $inc: { points: pointsEarned } },
    { new: true }
  );

  // 9) Send confirmation email
  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  if (created.renterEmail) {
    await sendEmail(
      created.renterEmail,
      `📅 ${mosqueName} - Event Hall Booking Request Received`,
      `
        <h2>Hello ${created.renterName} 👋</h2>
        <p>Thank you for your event hall booking request at <b>${mosqueName}</b>.</p>
        <p><b>Event type:</b> ${created.eventType || "N/A"}</p>
        <p><b>Attendees:</b> ${created.attendeesCount || "N/A"}</p>
        <p><b>Date:</b> ${created.dateOfRent.toDateString()}</p>
        <p><b>From:</b> ${created.startRentTime}</p>
        <p><b>To:</b> ${created.endRentTime}</p>
        <p><b>Phone:</b> ${created.renterPhone}</p>
        <p><b>Comments:</b> ${created.anyComment || "None"}</p>
        <p><b>Total Price:</b> ${created.totalPrice} ₪</p>
        ${pointsEarned ? `<p><b>Points Earned:</b> ${pointsEarned} ⭐</p>` : ""}
        <hr/>
        <p>We will contact you soon to confirm ✅</p>
      `
    );
  }

  return res.status(201).json({
    success: true,
    message: "Booking request submitted",
    data: created,
  });
});


export const updateBooking = asyncHandler(async (req,res)=>{
  const bookingId = req.params.bookingId || req.params.id;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Booking id is required in params" });
  }

  const existing = await Booking.findById(bookingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  // Authorization: owner OR staff (admin / teacher)
  const isStaff = ["admin", "teacher"].includes(req.user?.role);
  const isOwner = existing.userId && String(existing.userId) === String(req.user?._id);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ success: false, message: "Access denied: You don't have permission to perform this action." });
  }

  const {
    renterName,
    renterPhone,
    renterEmail,
    dateOfRent,
    startRentTime,
    endRentTime,
    anyComment,
    eventType,
    attendeesCount,
    status,
    pricePerHour,
  } = req.body || {};

  const updates = {};

  if (renterName !== undefined) updates.renterName = renterName;
  if (renterPhone !== undefined) updates.renterPhone = renterPhone;
  if (renterEmail !== undefined) updates.renterEmail = renterEmail;
  if (anyComment !== undefined) updates.anyComment = anyComment;
  if (eventType !== undefined) updates.eventType = eventType;
  if (attendeesCount !== undefined) updates.attendeesCount = attendeesCount;
  // Only staff (admin / teacher) can change status
  if (status !== undefined) {
    if (!isStaff) {
      return res.status(403).json({ success: false, message: "Only staff can change booking status" });
    }
    updates.status = status; // one of [confirmed, pending, cancelled]
  }
  if (pricePerHour !== undefined) updates.pricePerHour = Number(pricePerHour);

  // Determine final temporal values considering partial updates
  let finalDate = existing.dateOfRent;
  let finalStart = existing.startRentTime;
  let finalEnd = existing.endRentTime;

  if (dateOfRent !== undefined) {
    const { dayStart } = getDayBounds(String(dateOfRent));
    finalDate = dayStart;
     finalDate.toLocaleDateString('en-CA');
  }
  // console.log({finalDate: finalDate.toLocaleDateString('en-CA')});
  // return res.json({
  //   message: finalDate.toLocaleDateString('en-CA'), // Returns YYYY-MM-DD format in local timezone
  //   originalDate: finalDate,
  //   isoString: finalDate.toISOString(),  The UTC ISO 2025-08-27T21:00:00.000Z
  //   localDate: finalDate.toLocaleDateString(), /8/28/2025
  //   localTime: finalDate.toLocaleTimeString() 12:00:00 AM
  // })
  if (startRentTime !== undefined) finalStart = String(startRentTime);
  if (endRentTime !== undefined) finalEnd = String(endRentTime);

  // If any of date/start/end changed, validate and check conflicts and recalc derived fields
  const temporalChanged =
    dateOfRent !== undefined || startRentTime !== undefined || endRentTime !== undefined;

  if (temporalChanged) {
    // 1) Validate date not in past
    validateNotPastDate(finalDate);

    // 2) Validate times order
    validateTimeOrder(finalStart, finalEnd);

    // 3) If booking today and start time changed or date changed to today, ensure start not in past
    validateNotPastTimeToday(finalDate, finalStart);

    // 4) Check overlap with other bookings on same date (exclude self)
    const { dayStart, dayEnd } = { dayStart: new Date(finalDate), dayEnd: new Date(finalDate) };
    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(23, 59, 59, 999);

    const candidates = await Booking.find({
      _id: { $ne: existing._id },
      dateOfRent: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    }).lean();

    const newStartMin = toMinutes(finalStart);
    const newEndMin = toMinutes(finalEnd);
    const hasConflict = candidates.some((b) => {
      const bStart = toMinutes(b.startRentTime);
      const bEnd = toMinutes(b.endRentTime);
      return !(newEndMin <= bStart || newStartMin >= bEnd);
    });

    if (hasConflict) {
      return res.status(409).json({ success: false, message: "Time slot not available for the selected date" });
    }

    // 5) Recalculate derived fields
    const durationHours = calculateDurationHours(finalStart, finalEnd);
    const effectivePricePerHour = updates.pricePerHour ?? existing.pricePerHour ?? 70;
    const totalPrice = calculatePrice(durationHours, effectivePricePerHour);

    updates.dateOfRent = finalDate.toLocaleDateString('en-CA'); // Store the date directly without converting to UTC
    updates.startRentTime = finalStart;
    updates.endRentTime = finalEnd;
    updates.durationHours = durationHours;
    updates.totalPrice = totalPrice;
    updates.pricePerHour = effectivePricePerHour;
  }

  // No-op
  if (Object.keys(updates).length === 0) {
    return res.status(200).json({ success: true, message: "Nothing to update", data: existing });
  }

  updates.updatedAt = new Date();

  const updated = await Booking.findByIdAndUpdate(existing._id, updates, { new: true, runValidators: true });
  return res.status(200).json({ success: true, message: "Booking updated", data: updated });
});

export const deleteBooking = asyncHandler(async (req, res, next) => {
  const bookingId = req.params.bookingId || req.params.id;
  
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Booking ID is required in params" });
  }

  // Find the booking
  const existing = await Booking.findById(bookingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  // Authorization: owner OR staff (admin / teacher)
  const isStaff = ["admin", "teacher"].includes(req.user?.role);
  const isOwner = existing.userId && String(existing.userId) === String(req.user?._id);

  if (!isOwner && !isStaff) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You don't have permission to delete this booking.",
    });
  }

  if (existing.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    });
  }

  // Deduct loyalty points only if the booking was owned by a registered user
  let pointsToDeduct = 0;
  if (existing.userId) {
    pointsToDeduct = calculatePoints(existing.durationHours);
    await User.findByIdAndUpdate(
      existing.userId,
      { $inc: { points: -pointsToDeduct } },
      { new: true }
    );
  }

  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  if (existing.renterEmail) {
    await sendEmail(
      existing.renterEmail,
      `🗑️ ${mosqueName} - Your Booking Has Been Cancelled`,
      `
        <h2>Hello ${existing.renterName} 👋</h2>
        <p>Your event hall booking at <b>${mosqueName}</b> has been cancelled.</p>
        <p><b>Date:</b> ${existing.dateOfRent.toDateString()}</p>
        <p><b>From:</b> ${existing.startRentTime}</p>
        <p><b>To:</b> ${existing.endRentTime}</p>
        <p><b>Phone:</b> ${existing.renterPhone}</p>
        <p><b>Comments:</b> ${existing.anyComment || "None"}</p>
        ${pointsToDeduct ? `<p><b>Points Deducted:</b> ${pointsToDeduct} ⭐</p>` : ""}
        <hr/>
        <p>If you have any questions, please contact us.</p>
      `
    );
  }

  // Soft delete: Update status to cancelled instead of deleting
  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { status: "cancelled", updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  return res.status(200).json({ 
    success: true, 
    message: "Booking deleted successfully",
    deletedBooking: {
      id: existing._id,
      renterName: existing.renterName,
      dateOfRent: existing.dateOfRent,
      startRentTime: existing.startRentTime,
      endRentTime: existing.endRentTime,
      pointsDeducted: pointsToDeduct
    }
  });
});

// Admin: Get all bookings with optional filters and pagination
export const getAllBookings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    date,
    renterPhone,
    renterName,
    sort = '-createdAt'
  } = req.query || {};

  const numericPage = Math.max(1, parseInt(page));//Ensure page is at least 1
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit))); //Ensure limit is at least 1 and at most 100
  const skip = (numericPage - 1) * numericLimit;

  const filter = {};
  if (status) filter.status = status;
  if (renterPhone) filter.renterPhone = new RegExp(renterPhone, 'i');// يعمل بحث بـ Regex (يعني مش لازم يكتب الرقم أو الاسم كامل).
  if (renterName) filter.renterName = new RegExp(renterName, 'i'); 

  if (date) {
    // expecting YYYY-MM-DD
    const [y,m,d] = String(date).split('-').map(Number);
    const start = new Date(y, m-1, d, 0,0,0,0);//start of the day
    const end = new Date(y, m-1, d, 23,59,59,999);//end of the day
    filter.dateOfRent = { $gte: start, $lte: end };//filter by date of rent
  }
//items: bookings that match the filter
//total: total number of bookings that match the filter
const [items, total] = await Promise.all([//to run queries in parallel (faster/it means running two or more tasks at the same time,).

  //with promise.all we can run multiple queries(find ,sort , skip , limit , countDocuments) at the same time and wait for all of them to complete.
    Booking.find(filter).sort(sort).skip(skip).limit(numericLimit)
    .lean(),//(plain JavaScript object ده بيخلي الكود أسرع 🏎️ وأخف على السيرفر، خصوصًا لو بتتعامل مع آلاف الحجوزات.
     

    // countDocuments is used to count the number of documents that match the filter.
    Booking.countDocuments(filter)
  ]);

  return res.status(200).json({
    success: true,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit)
    },
    data: items
  });
});

// Admin-only: cancel a booking (soft-cancel by setting status = "cancelled")
export const adminCancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Booking ID is required in params" });
  }

  const existing = await Booking.findById(bookingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (existing.status === "cancelled") {
    return res.status(200).json({ success: true, message: "Booking already cancelled", data: existing });
  }

  // Only deduct points if the booking belongs to a registered user
  let pointsToDeduct = 0;
  if (existing.userId) {
    pointsToDeduct = calculatePoints(existing.durationHours);
    await User.findByIdAndUpdate(
      existing.userId,
      { $inc: { points: -pointsToDeduct } },
      { new: true }
    );
  }

  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { status: "cancelled", updatedAt: new Date() },
    { new: true }
  );

  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  if (existing.renterEmail) {
    await sendEmail(
      existing.renterEmail,
      `❌ ${mosqueName} - Your Booking Has Been Cancelled`,
      `
        <h2>Hello ${existing.renterName} 👋</h2>
        <p>Your event hall booking at <b>${mosqueName}</b> has been cancelled by the administrator.</p>
        <p><b>Date:</b> ${new Date(existing.dateOfRent).toDateString()}</p>
        <p><b>From:</b> ${existing.startRentTime}</p>
        <p><b>To:</b> ${existing.endRentTime}</p>
        ${pointsToDeduct ? `<p><b>Points Deducted:</b> -${pointsToDeduct} ⭐</p>` : ""}
      `
    );
  }

  return res.status(200).json({ success: true, message: "Booking cancelled", data: updated });
});

// Admin-only: change booking status (pending | confirmed | cancelled)
export const adminChangeStatus = asyncHandler(async (req, res) => {
   const { bookingId } = req.params;
  const { status } = req.body || {};

  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Booking ID is required in params" });
  }
  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required in body" });
  }

  const existing = await Booking.findById(bookingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  let pointsDeducted = 0;
  // If moving to cancelled from a non-cancelled state, deduct points once (only for registered owners)
  if (status === "cancelled" && existing.status !== "cancelled" && existing.userId) {
    pointsDeducted = calculatePoints(existing.durationHours);
    await User.findByIdAndUpdate(
      existing.userId,
      { $inc: { points: -pointsDeducted } },
      { new: true }
    );
  }

  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { status, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  return res.status(200).json({ success: true, message: "Status updated", data: updated, pointsDeducted });
});

// // Admin: Export all bookings to PDF
// export const exportBookingsToPDF = asyncHandler(async (req, res) => {
//   const {
//     status,
//     date,
//     renterPhone,
//     renterName,
//     sort = '-createdAt'
//   } = req.query || {};

//   // Build filter object (same as getAllBookings)
//   const filter = {};
//   if (status) filter.status = status;
//   if (renterPhone) filter.renterPhone = new RegExp(renterPhone, 'i');
//   if (renterName) filter.renterName = new RegExp(renterName, 'i');

//   if (date) {
//     const [y, m, d] = String(date).split('-').map(Number);
//     const start = new Date(y, m - 1, d, 0, 0, 0, 0);
//     const end = new Date(y, m - 1, d, 23, 59, 59, 999);
//     filter.dateOfRent = { $gte: start, $lte: end };
//   }

//   // Get all bookings (no pagination for PDF export)
//   const bookings = await Booking.find(filter)
//     .sort(sort)
//     .populate('userId', 'userName email')
//     .lean();

//   if (bookings.length === 0) {
//     return res.status(404).json({
//       success: false,
//       message: "No bookings found   "
//     });
//   }

//   // Generate HTML content for PDF
//   const htmlContent = generateBookingsHTML(bookings);

//   // Launch puppeteer and generate PDF
//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });

//   try {
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '20mm',
//         right: '15mm',
//         bottom: '20mm',
//         left: '15mm'
//       }
//     });

//     await browser.close();

//     // Set response headers for PDF download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="bookings-report-${new Date().toISOString().split('T')[0]}.pdf"`);
//     res.setHeader('Content-Length', pdfBuffer.length);

//     return res.send(pdfBuffer);

//   } catch (error) {
//     await browser.close();
//     throw error;
//   }
// });

// // Helper function to generate HTML content for PDF
// const generateBookingsHTML = (bookings) => {
//   const currentDate = new Date().toLocaleDateString();
//   const totalBookings = bookings.length;
//   const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

//   // Group bookings by status for summary
//   const statusCounts = bookings.reduce((acc, booking) => {
//     acc[booking.status] = (acc[booking.status] || 0) + 1;
//     return acc;
//   }, {});

//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>Bookings Report</title>
//         <style>
//             body {
//                 font-family: Arial, sans-serif;
//                 margin: 0;
//                 padding: 20px;
//                 color: #333;
//             }
//             .header {
//                 text-align: center;
//                 margin-bottom: 30px;
//                 border-bottom: 2px solid #007bff;
//                 padding-bottom: 20px;
//             }
//             .header h1 {
//                 color: #007bff;
//                 margin: 0;
//                 font-size: 28px;
//             }
//             .header p {
//                 margin: 5px 0;
//                 color: #666;
//             }
//             .summary {
//                 background-color: #f8f9fa;
//                 padding: 20px;
//                 border-radius: 8px;
//                 margin-bottom: 30px;
//             }
//             .summary h2 {
//                 color: #007bff;
//                 margin-top: 0;
//             }
//             .summary-grid {
//                 display: grid;
//                 grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//                 gap: 15px;
//                 margin-top: 15px;
//             }
//             .summary-item {
//                 background: white;
//                 padding: 15px;
//                 border-radius: 5px;
//                 text-align: center;
//                 box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//             }
//             .summary-item h3 {
//                 margin: 0 0 5px 0;
//                 color: #007bff;
//                 font-size: 24px;
//             }
//             .summary-item p {
//                 margin: 0;
//                 color: #666;
//                 font-size: 14px;
//             }
//             .bookings-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 margin-top: 20px;
//             }
//             .bookings-table th,
//             .bookings-table td {
//                 border: 1px solid #ddd;
//                 padding: 12px;
//                 text-align: left;
//                 font-size: 12px;
//             }
//             .bookings-table th {
//                 background-color: #007bff;
//                 color: white;
//                 font-weight: bold;
//             }
//             .bookings-table tr:nth-child(even) {
//                 background-color: #f9f9f9;
//             }
//             .status-badge {
//                 padding: 4px 8px;
//                 border-radius: 4px;
//                 font-size: 11px;
//                 font-weight: bold;
//                 text-transform: uppercase;
//             }
//             .status-confirmed {
//                 background-color: #d4edda;
//                 color: #155724;
//             }
//             .status-pending {
//                 background-color: #fff3cd;
//                 color: #856404;
//             }
//             .status-cancelled {
//                 background-color: #f8d7da;
//                 color: #721c24;
//             }
//             .footer {
//                 margin-top: 30px;
//                 text-align: center;
//                 color: #666;
//                 font-size: 12px;
//                 border-top: 1px solid #ddd;
//                 padding-top: 20px;
//             }
//         </style>
//     </head>
//     <body>
//         <div class="header">
//             <h1>🏟️ Soccer Field Bookings Report</h1>
//             <p>Generated on: ${currentDate}</p>
//             <p>Total Bookings: ${totalBookings}</p>
//         </div>

//         <div class="summary">
//             <h2>📊 Summary</h2>
//             <div class="summary-grid">
//                 <div class="summary-item">
//                     <h3>${totalBookings}</h3>
//                     <p>Total Bookings</p>
//                 </div>
//                 <div class="summary-item">
//                     <h3>₪${totalRevenue.toFixed(2)}</h3>
//                     <p>Total Revenue</p>
//                 </div>
//                 <div class="summary-item">
//                     <h3>${statusCounts.confirmed || 0}</h3>
//                     <p>Confirmed</p>
//                 </div>
//                 <div class="summary-item">
//                     <h3>${statusCounts.pending || 0}</h3>
//                     <p>Pending</p>
//                 </div>
//                 <div class="summary-item">
//                     <h3>${statusCounts.cancelled || 0}</h3>
//                     <p>Cancelled</p>
//                 </div>
//             </div>
//         </div>

//         <table class="bookings-table">
//             <thead>
//                 <tr>
//                     <th>Booking ID</th>
//                     <th>Renter Name</th>
//                     <th>Phone</th>
//                     <th>Email</th>
//                     <th>Date</th>
//                     <th>Start Time</th>
//                     <th>End Time</th>
//                     <th>Duration</th>
//                     <th>Price/Hour</th>
//                     <th>Total Price</th>
//                     <th>Status</th>
//                     <th>Comments</th>
//                     <th>Created</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${bookings.map(booking => `
//                     <tr>
//                         <td>${booking._id.toString().slice(-8)}</td>
//                         <td>${booking.renterName}</td>
//                         <td>${booking.renterPhone}</td>
//                         <td>${booking.renterEmail || 'N/A'}</td>
//                         <td>${new Date(booking.dateOfRent).toLocaleDateString()}</td>
//                         <td>${booking.startRentTime}</td>
//                         <td>${booking.endRentTime}</td>
//                         <td>${booking.durationHours}h</td>
//                         <td>₪${booking.pricePerHour}</td>
//                         <td>₪${booking.totalPrice}</td>
//                         <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
//                         <td>${booking.anyComment || 'N/A'}</td>
//                         <td>${new Date(booking.createdAt).toLocaleDateString()}</td>
//                     </tr>
//                 `).join('')}
//             </tbody>
//         </table>

//         <div class="footer">
//             <p>This report was generated automatically by the Soccer Field Booking System</p>
//             <p>For any questions, please contact the system administrator</p>
//         </div>
//     </body>
//     </html>
//   `;
// };

