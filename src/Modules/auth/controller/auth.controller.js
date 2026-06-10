import userModel from "../../../../database/Models/user.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import { compare, hash } from "bcrypt";
import bcrypt from "bcrypt";
import { sendEmail } from "../../../Services/SendEmail.services.js";
import { customAlphabet } from "nanoid";
import crypto from "crypto";

// #region one for signin function 


const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const signin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
  const user = await userModel.findOne({ email: normalizedEmail });

  if (!user) {
    return next(new Error(
      `No account is registered with the email "${normalizedEmail}". Please sign up first or check the email for typos.`,
      { cause: 404 }
    ));
  }

  // // Account lockout check
  // if (user.lockUntil && user.lockUntil > new Date()) {
  //   const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000);
  //   return next(new Error(
  //     `This account is temporarily locked after ${MAX_FAILED_ATTEMPTS} failed login attempts. Please try again in ${minutesLeft} minute(s) or reset your password via /auth/sendCode.`,
  //     { cause: 423 }
  //   ));
  // }

  if (!user.confirmEmail) {
    return next(new Error(
      "Your email address has not been verified yet. Please open the verification link we sent to your inbox before signing in.",
      { cause: 403 }
    ));
  }

  const storedLooksLikeBcrypt = typeof user.password === "string" && /^\$2[aby]\$/.test(user.password);
  if (!storedLooksLikeBcrypt) {
    return next(new Error(
      "This account's password is not stored correctly (missing or invalid hash). Please reset your password using /auth/sendCode and /auth/forgotPassword.",
      { cause: 500 }
    ));
  }

  const match = await compare(password, user.password);

  if (!match) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - user.failedLoginAttempts);
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    const message = attemptsLeft > 0
      ? `Incorrect password for "${normalizedEmail}". You have ${attemptsLeft} attempt(s) left before this account is locked for ${LOCK_MINUTES} minutes.`
      : `Incorrect password. This account has now been locked for ${LOCK_MINUTES} minutes. You can reset your password via /auth/sendCode.`;
    return next(new Error(message, { cause: 401 }));
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.SIGNATURE,
    { expiresIn: "12h" }
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
const createUserAndSendVerification = async ({ userName, password, email, phone, gender, role, req }) => {
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return { ok: false, status: 400, message: "Email already registered" };
  }

  const hashPassword = await bcrypt.hash(password, 12); // stronger cost factor
  const tokenId = crypto.randomUUID();
  const emailToken = jwt.sign(
    { email, tokenId },
    process.env.CONFIRM_SIGNATURE,
    { expiresIn: "1h" }
  );

  const newUser = await userModel.create({
    userName,
    password: hashPassword,
    email,
    phone,
    role,
    gender,
    confirmEmail: false,
    forgetPassword: null,
    verificationTokenId: tokenId,
  });

  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  const linkToConfirmEmail = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${emailToken}`;
  const emailHtml = `
<h1>Welcome to ${mosqueName}</h1>
<p>Please verify your email by clicking the link below:</p>
<a href="${linkToConfirmEmail}" target="_blank">Verify Email</a>
`;

  const emailSent = await sendEmail(email, `Confirm your email - ${mosqueName}`, emailHtml);
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
    userName, password, email, phone, gender, role: "user", req,
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  return res.status(201).json({
    message: "Signup successful! Please check your email to confirm.",
    role: "user",
  });
});

// Admin-only: create any role.
export const adminCreateUser = asyncHandler(async (req, res, next) => {
  const { userName, password, email, phone, gender, role } = req.body;
  console.log(req.body);
  const result = await createUserAndSendVerification({
    userName, password, email, phone, gender, role, req,
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  return res.status(201).json({
    message: `User created with role: ${role}. Verification email sent.`,
    userId: result.user._id,
  });
});

export const adminCreateTeacher = asyncHandler(async (req, res, next) => {
  const { userName, password, email, phone, gender } = req.body;
  const result = await createUserAndSendVerification({
    userName, password, email, phone, gender, role: "teacher", req,
  });
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  return res.status(201).json({
    message: "User created with role: teacher. Verification email sent.",
    userId: result.user._id,
  });
});

// Admin-only: list users (filter by role / search by username or email)
export const adminListUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, role, search, sort = "-createdAt" } = req.query || {};
  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = {};
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
  const user = await userModel.findById(id)
    .select("-password -forgetPassword -verificationTokenId");
  if (!user) return next(new Error("User not found", { cause: 404 }));
  return res.status(200).json({ success: true, data: user });
});

// Admin-only: update user (profile fields and/or role)
export const adminUpdateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const target = await userModel.findById(id);
  if (!target) return next(new Error("User not found", { cause: 404 }));

  const allowed = ["userName", "email", "phone", "gender", "role", "confirmEmail"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Safety: prevent an admin from demoting themselves
  if (String(target._id) === String(req.user._id) && updates.role && updates.role !== "admin") {
    return next(new Error("You cannot change your own role", { cause: 400 }));
  }

  const updated = await userModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    .select("-password -forgetPassword -verificationTokenId");
  return res.status(200).json({ success: true, message: "User updated", data: updated });
});

// Admin-only: delete user
export const adminDeleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (String(req.user._id) === String(id)) {
    return next(new Error("You cannot delete your own account", { cause: 400 }));
  }
  const deleted = await userModel.findByIdAndDelete(id);
  if (!deleted) return next(new Error("User not found", { cause: 404 }));
  return res.status(200).json({ success: true, message: "User deleted" });
});

// Any authenticated user: get own profile
export const me = asyncHandler(async (req, res, next) => {
  const user = await userModel.findById(req.user._id)
    .select("-password -forgetPassword -verificationTokenId");
  return res.status(200).json({ success: true, data: user });
});

export const confairmEmails = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const decoded = await jwt.verify(token, process.env.CONFIRM_SIGNATURE );
  const checkuser = await userModel.findOne({ email: decoded.email });
  // Validate token payload
   if (
    !decoded ||
    !decoded.email ||
    typeof decoded.email !== "string" ||
    checkuser.verificationTokenId !== decoded.tokenId
  ) {
    return next(new Error(" Invalid token payload ", { cause: 400 }));
  }

  // Check token expiration explicitly
  if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    return next(new Error("Token expired", { cause: 401 }));
  }
  const user = await userModel.updateOne(
    { email: decoded.email },
    { confirmEmail: true, tokenId: null } // remove tokenId so it can't be reused
  );

  return res.status(200).json({ message: "Email confirmed" });
  // return res.status(200).redirect(`${process.env.FRONTEND_URL}`); //login page url
});

export const checkConfirmEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.params;
  const user = await userModel.findOne({ email });
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(new Error("Email not confirmed", { cause: 401 }));
  }
  return res.status(200).json({ message: "Email confirmed" });
});

export const sendCode = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  console.log("Email received:", email);

  const user = await userModel.findOne({ email });
  console.log("User found:", user);

  if (!user) {
    return next(new Error("Email does not exist"));
  }
  if (!user.confirmEmail) {
    return next(new Error("Please verify your email"));
  }

  // Initialize the customAlphabet generator
  const generateCode = customAlphabet("012ahm6789", 6);
  const code = generateCode();
  console.log("Generated code:", code);

  try {
    // Send email first
    await sendEmail(
      email,
      "Your verification code",
      `Your verification code is ${code}`
    );

    // Then update the database
    const updatedUser = await userModel.findOneAndUpdate(
      { email },
      { $set: { forgetPassword: code } },
      { new: true }
    );
    console.log("Updated user:", updatedUser);

    if (!updatedUser) {
      console.log("Update failed - no user found");
      return next(new Error("Failed to update user"));
    }

    return res
      .status(200)
      .json({ message: "Code sent successfully", updatedUser });
  } catch (error) {
    console.error("Error in sendCode:", error);
    return next(new Error("Failed to process request: " + error.message));
  }
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { code, email, NEWpassword } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return next(new Error("User not found"));
  }

  if (user.forgetPassword != code || !code) {
    return next(new Error("code is incorrect"));
  }

  const hashPass = await bcrypt.hash(NEWpassword, 12);
  user.password = hashPass;
  user.forgetPassword = null;
  user.changePasswordTime = Date.now();
  await user.save();
  return res.json({ message: "Password updated successfully" });
});

export const logout = asyncHandler(async (req, res, next) => {
  // Stateless JWT logout: client should discard the token.
  // For server-side invalidation, see suggested security improvements (token blacklist / refresh tokens).
  return res.json({ message: "Logged out" });
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword, CnewPassword } = req.body;
  const user = req.user;

  if (newPassword !== CnewPassword) {
    return next(new Error("New password and confirmation do not match", { cause: 400 }));
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
