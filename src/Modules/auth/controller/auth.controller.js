import userModel from "../../../../database/Models/user.model.js";
import teacherModel from "../../../../database/Models/teacher.model.js";
import auditLogModel from "../../../../database/Models/auditLog.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import { compare } from "bcrypt";
import bcrypt from "bcrypt";
import { sendEmail } from "../../../Services/SendEmail.services.js";
import { revokeToken } from "../../../Services/tokenBlacklist.services.js";
import crypto from "crypto";


// #region one for signin function 


const RESET_CODE_TTL_MINUTES = 10;
const MAX_RESET_CODE_ATTEMPTS = 5;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

const hashResetCode = (code) => {
  const secret = process.env.RESET_CODE_SECRET || process.env.SIGNATURE;
  if (!secret) throw new Error("RESET_CODE_SECRET or SIGNATURE must be configured");
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
};

const hashesMatch = (storedHash, candidateHash) => {
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"));
};

const createConfirmationUrl = (emailToken) => {
  const apiBaseUrl = process.env.API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!apiBaseUrl) throw new Error("API_BASE_URL must be configured to send verification emails");
  const parsedApiUrl = new URL(apiBaseUrl);
  const allowedProtocols = process.env.NODE_ENV === "production" ? ["https:"] : ["http:", "https:"];
  if (!allowedProtocols.includes(parsedApiUrl.protocol)) throw new Error("API_BASE_URL must use HTTPS in production");
  return new URL(`/auth/confirmEmail/${encodeURIComponent(emailToken)}`, parsedApiUrl).toString();
};

export const signin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
  const user = await userModel.findOne({ email: normalizedEmail, deletedAt: null });

  if (!user || !user.confirmEmail) {
    return next(new Error("Email not verified", { cause: 401 }));
  }

  const storedLooksLikeBcrypt = typeof user.password === "string" && /^\$2[aby]\$/.test(user.password);
  if (!storedLooksLikeBcrypt) {
    console.error("Authentication refused an account with an invalid password hash", { userId: user._id });
    return next(new Error(INVALID_CREDENTIALS_MESSAGE, { cause: 401 }));
  }

  const match = await compare(password, user.password);

  if (!match) {
    return next(new Error(INVALID_CREDENTIALS_MESSAGE, { cause: 401 }));
  }

  user.lockUntil = null;
  await user.save();
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.SIGNATURE,
    { expiresIn: "12h", jwtid: crypto.randomUUID() }
  );
  return res.json({
    success: true,
    message: `Welcome back, ${user.userName}! You are signed in as ${user.role}.`,
    token,
    role: user.role,
  });
});
// #endregion
// Internal helper used by both public signup and admin user creation.
const createUserAndSendVerification = async ({ userName, password, email, phone, gender, role }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    return { ok: false, status: 400, message: "Email already registered" };
  }

  const hashPassword = await bcrypt.hash(password, 12); // stronger cost factor
  const tokenId = crypto.randomUUID();
  const emailToken = jwt.sign(
    { email: normalizedEmail, tokenId },
    process.env.CONFIRM_SIGNATURE,
    { expiresIn: "50h" }
  );

  let confirmationUrl;
  try {
    confirmationUrl = createConfirmationUrl(emailToken);
  } catch {
    return { ok: false, status: 500, message: "API_BASE_URL must be a valid HTTP URL (HTTPS in production)" };
  }

  const newUser = await userModel.create({
    userName,
    password: hashPassword,
    email: normalizedEmail,
    phone,
    role,
    gender,
    confirmEmail: false,
    forgetPassword: null,
    verificationTokenId: tokenId,
  });

  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  const emailHtml = `
<h1>Welcome to ${mosqueName}</h1>
<p>Please verify your email by clicking the link below:</p>
<a href="${confirmationUrl}" target="_blank" rel="noopener noreferrer">Verify Email</a>
`;

  const emailSent = await sendEmail(normalizedEmail, `Confirm your email - ${mosqueName}`, emailHtml);
  if (!emailSent || !emailSent.success) {
    await userModel.deleteOne({ _id: newUser._id });
    return { ok: false, status: 500, message: "Failed to send email. Please try again." };
  }
  return { ok: true, user: newUser };
};

// Public self-signup: visitor always becomes a "user".
// Student is granted later through course enrollment or by an admin.
export const signup = asyncHandler(async (req, res, next) => {
  const { userName, password, email, phone, gender } = req.body;
  const result = await createUserAndSendVerification({
    userName, password, email, phone, gender, role: "user",
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  return res.status(201).json({
    message: "Signup successful! Please check your email to confirm.",
    role: "user",
  });
});



export const adminListTeachers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, search = "" } = req.query || {};
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { deletedAt: null };
  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [
      { specialization: rx },
      { qualification: rx },
      { bio: rx },
    ];
  }

  const [items, total] = await Promise.all([
    teacherModel
      .find(filter)
      .populate("userId", "-password -forgetPassword -verificationTokenId")
      .sort("-createdAt")
      .skip(skip)
      .limit(numericLimit),
    teacherModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    pagination: { page: numericPage, limit: numericLimit, total, pages: Math.ceil(total / numericLimit) },
    data: items,
  });
});

export const adminGetTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const teacher = await teacherModel
    .findOne({ _id: id, deletedAt: null })
    .populate("userId", "-password -forgetPassword -verificationTokenId");

  if (!teacher) return next(new Error("Teacher not found", { cause: 404 }));

  return res.status(200).json({ success: true, data: teacher });
});

export const adminDeleteTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const currentUser = req.user;
  const ipAddress = req.ip || req.connection.remoteAddress || null;

  const teacher = await teacherModel.findOne({ _id: id, deletedAt: null });
  if (!teacher) return next(new Error("Teacher not found", { cause: 404 }));

  // Soft delete - set deletedAt timestamp
  teacher.deletedAt = new Date();
  await teacher.save();

  // Log the deletion to audit trail
  const user = await userModel.findById(teacher.userId);
  await auditLogModel.create({
    action: "DELETE_TEACHER",
    performedBy: currentUser._id,
    performedByRole: currentUser.role,
    targetUser: teacher.userId,
    targetUserRole: user?.role || "teacher",
    targetUserEmail: user?.email || "unknown",
    targetUserName: user?.userName || teacher.name || "unknown",
    ipAddress,
  });

  return res.status(200).json({ success: true, message: "Teacher deleted successfully" });
});

// Admin-only: list users (filter by role / search by username or email)
export const adminListUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, role, search, sort = "-createdAt" } = req.query || {};
  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { deletedAt: null, role: "user" };
  if (role) filter.role = role;
  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [{ userName: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    userModel.find(filter).select("-password -forgetPassword -verificationTokenId")
      .sort(sort).skip(skip).limit(numericLimit).lean(),
    userModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    pagination: { page: numericPage, limit: numericLimit, total, pages: Math.ceil(total / numericLimit) },
    data: items,
  });
});

// Admin-only: get a single user by id
export const adminGetUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findOne({ _id: id, role: "user", deletedAt: null })
    .select("-password -forgetPassword -verificationTokenId");
  if (!user) return next(new Error("User not found", { cause: 404 }));
  return res.status(200).json({ success: true, data: user });
});

// Admin-only: update user (profile fields and/or role)
export const adminUpdateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const target = await userModel.findById(id);
  if (!target) return next(new Error("User not found", { cause: 404 }));

  const allowed = ["userName", "email", "phone", "gender", "confirmEmail"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = await userModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    .select("-password -forgetPassword -verificationTokenId");
  return res.status(200).json({ success: true, message: "User updated", data: updated });
});

// Admin-only: delete user
export const adminDeleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const currentUser = req.user;
  const ipAddress = req.ip || req.connection.remoteAddress || null;

  // Nobody can delete themselves
  if (String(currentUser._id) === String(id)) {
    return next(new Error("You cannot delete your own account", { cause: 400 }));
  }

  // Fetch the user to be deleted
  const userToDelete = await userModel.findOne({ _id: id, role: "user", deletedAt: null });
  if (!userToDelete) return next(new Error("User not found", { cause: 404 }));

  // Only superAdmin can delete admin users
  if (userToDelete.role === "admin" && currentUser.role !== "superAdmin") {
    return next(new Error("Admin cant delete them self", { cause: 403 }));
  }

  // SuperAdmin cannot be deleted by anyone (including themselves, already checked above)
  if (userToDelete.role === "superAdmin") {
    return next(new Error("Super Admin accounts cannot be deleted", { cause: 403 }));
  }

  // Soft delete - set deletedAt timestamp
  userToDelete.deletedAt = new Date();
  await userToDelete.save();

  // Log the deletion to audit trail
  await auditLogModel.create({
    action: "DELETE_USER",
    performedBy: currentUser._id,
    performedByRole: currentUser.role,
    targetUser: userToDelete._id,
    targetUserRole: userToDelete.role,
    targetUserEmail: userToDelete.email,
    targetUserName: userToDelete.userName,
    ipAddress,
  });

  return res.status(200).json({ success: true, message: "User deleted successfully" });
});

// Any authenticated user: get own profile
export const me = asyncHandler(async (req, res, next) => {
  const user = await userModel.findById(req.user._id)
    .select("-password -forgetPassword -verificationTokenId");
  return res.status(200).json({ success: true, data: user });
});

export const confairmEmails = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const decoded = await jwt.verify(token, process.env.CONFIRM_SIGNATURE);
  const checkuser = await userModel.findOne({ email: decoded.email, deletedAt: null });
  // Validate token payload
  if (
    !decoded ||
    !decoded.email ||
    typeof decoded.email !== "string" ||
    !checkuser ||
    checkuser.verificationTokenId !== decoded.tokenId
  ) {
    return next(new Error(" Invalid token payload ", { cause: 400 }));
  }

  // Check token expiration explicitly
  if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    return next(new Error("Token expired", { cause: 401 }));
  }
  const user = await userModel.updateOne(
    { email: decoded.email, verificationTokenId: decoded.tokenId, deletedAt: null },
    { $set: { confirmEmail: true, verificationTokenId: null } }
  );

  return res.status(200).json({ message: "Email confirmed" });
});



export const sendCode = asyncHandler(async (req, res, next) => {
  const normalizedEmail = req.body.email.trim().toLowerCase();
  const genericResponse = {
    message: "Request received. Any reset code issued expires in 10 minutes.",
  };
  const user = await userModel.findOne({
    email: normalizedEmail,
    confirmEmail: true,
    deletedAt: null,
  });
  if (!user) return res.status(202).json(genericResponse);

  const code = crypto.randomInt(0, 100_000_000).toString().padStart(8, "0");
  console.log(code);
  const codeHash = hashResetCode(code);
  const requestedAt = new Date();
  const expiresAt = new Date(requestedAt.getTime() + RESET_CODE_TTL_MINUTES * 60 * 1000);
  const requestAllowedBefore = new Date(requestedAt.getTime() - 60 * 1000);
  const updatedUser = await userModel.findOneAndUpdate(
    {
      _id: user._id,
      confirmEmail: true,
      deletedAt: null,
      $or: [
        { forgetPasswordRequestedAt: null },
        { forgetPasswordRequestedAt: { $lte: requestAllowedBefore } },
      ],
    },
    { $set: {
      forgetPassword: "",
      forgetPasswordHash: codeHash,
      forgetPasswordExpiresAt: expiresAt,
      forgetPasswordAttempts: 0,
      forgetPasswordRequestedAt: requestedAt,
    } },
    { new: true }
  ).select("_id");
  if (!updatedUser) return res.status(202).json(genericResponse);

  const emailResult = await sendEmail(
    normalizedEmail,
    "Your password reset code",
    `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in ${RESET_CODE_TTL_MINUTES} minutes and can only be used once.</p>`
  );
  if (!emailResult?.success) {
    await userModel.updateOne(
      { _id: user._id, forgetPasswordHash: codeHash },
      { $set: { forgetPasswordHash: "", forgetPasswordExpiresAt: null, forgetPasswordAttempts: 0 } }
    );
    console.error("Password reset email delivery failed", { userId: user._id });
  }

  return res.status(202).json(genericResponse);
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { code, NEWpassword } = req.body;
  const email = req.body.email.trim().toLowerCase();
  const user = await userModel.findOne({ email, confirmEmail: true, deletedAt: null }).select("_id");
  if (!user) {
    return next(new Error("Invalid or expired reset code", { cause: 400 }));
  }

  const now = new Date();
  const resetRecord = await userModel.findOneAndUpdate(
    {
      _id: user._id,
      confirmEmail: true,
      deletedAt: null,
      forgetPasswordExpiresAt: { $gt: now },
      forgetPasswordAttempts: { $lt: MAX_RESET_CODE_ATTEMPTS },
    },
    { $inc: { forgetPasswordAttempts: 1 } },
    { new: true }
  ).select("+forgetPasswordHash");
  if (!resetRecord || !hashesMatch(resetRecord.forgetPasswordHash, hashResetCode(code))) {
    return next(new Error("Invalid or expired reset code", { cause: 400 }));
  }

  const hashedPassword = await bcrypt.hash(NEWpassword, 12);
  const updatedUser = await userModel.findOneAndUpdate(
    {
      _id: user._id,
      forgetPasswordHash: resetRecord.forgetPasswordHash,
      forgetPasswordExpiresAt: { $gt: now },
      deletedAt: null,
    },
    {
      $set: {
        password: hashedPassword,
        forgetPassword: "",
        forgetPasswordHash: "",
        forgetPasswordExpiresAt: null,
        forgetPasswordAttempts: 0,
        changePasswordTime: now,
      },
    }
  );
  if (!updatedUser) {
    return next(new Error("Invalid or expired reset code", { cause: 400 }));
  }
  return res.json({ message: "Password updated successfully" });
});

export const logout = asyncHandler(async (req, res, next) => {
  if (req.authToken) await revokeToken(req.authToken);

  res.setHeader("Authorization", "");
  return res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword, CnewPassword } = req.body;
  const user = req.user;

  if (newPassword !== CnewPassword) {
    return next(new Error("New password and confirmation do not match", { cause: 400 }));
  }
  if (newPassword === oldPassword) {
    return next(new Error("New password cannot be the same as the old password", { cause: 400 }));
  }
  const matches = await bcrypt.compare(oldPassword, user.password);
  if (!matches) {
    return next(new Error("Old password is incorrect", { cause: 400 }));
  }
  user.password = await bcrypt.hash(newPassword, 12);
  user.changePasswordTime = Date.now();
  await user.save();
  return res.json({ message: "Password changed successfully" });
});

// Admin-only: reset password for student or teacher
export const adminResetPassword = asyncHandler(async (req, res, next) => {
  const { id, newPassword, CnewPassword } = req.body;
  const currentUser = req.user;
  const ipAddress = req.ip || req.connection.remoteAddress || null;

  if (newPassword !== CnewPassword) {
    return next(new Error("Passwords do not match", { cause: 400 }));
  }

  // Fetch the user whose password is being reset
  const targetUser = await userModel.findOne({ _id: id, deletedAt: null });
  if (!targetUser) return next(new Error("User not found", { cause: 404 }));

  // Only a superAdmin can reset passwords for privileged accounts.
  if (["admin", "superAdmin"].includes(targetUser.role) && currentUser.role !== "superAdmin") {
    return next(new Error("Only superAdmin can reset privileged account passwords", { cause: 403 }));
  }

  // Hash and update the password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  targetUser.password = hashedPassword;
  targetUser.changePasswordTime = Date.now();
  await targetUser.save();

  await auditLogModel.create({
    action: "RESET_PASSWORD",
    performedBy: currentUser._id,
    performedByRole: currentUser.role,
    targetUser: targetUser._id,
    targetUserRole: targetUser.role,
    targetUserEmail: targetUser.email,
    targetUserName: targetUser.userName,
    ipAddress,
  });

  return res.status(200).json({
    success: true,
    message: `Password reset successfully for ${targetUser.userName} ,${targetUser.email}`,
  });
});

// Get audit logs - admin/superAdmin only
export const getAuditLogs = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, action, performedBy } = req.query;
  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = {};
  if (action) filter.action = action;
  if (performedBy) filter.performedBy = performedBy;

  const logs = await auditLogModel
    .find(filter)
    .populate("performedBy", "userName email role")
    .populate("targetUser", "userName email role")
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(numericLimit);

  const total = await auditLogModel.countDocuments(filter);

  return res.status(200).json({
    success: true,
    data: logs,
    pagination: {
      currentPage: numericPage,
      totalPages: Math.ceil(total / numericLimit),
      total,
      limit: numericLimit,
    },
  });
});
