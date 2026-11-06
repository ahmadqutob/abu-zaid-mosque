import { asyncHandler } from "../Services/ErrorHandler.services.js"
import jwt from "jsonwebtoken";
import   userModel from "../../database/Models/user.model.js";
import { isTokenRevoked } from "../Services/tokenBlacklist.services.js";

export const role = {
    superAdmin: "superAdmin",
    admin: "admin",
    teacher: "teacher",
    student: "student",
    user: "user",
}

// Convenience groups
export const ROLES_ALL = [role.superAdmin, role.admin, role.teacher, role.student, role.user];
export const ROLES_STAFF = [role.superAdmin, role.admin, role.teacher];

const authorization = (accessRoles =[])=>{
    return asyncHandler(async (req ,res , next)=>{

        const authorizationHeader = req.headers.authorization?.trim();
        if(!authorizationHeader){
            return next(new Error("Please login first", { cause: 401 }));
        }

        const bearerKey = process.env.BEARER_KEY || "Bearer_";
        // Accept the standard Authorization: Bearer <JWT> scheme used by Postman
        // and browsers, plus the legacy configured prefix used by older clients.
        const standardBearer = authorizationHeader.match(/^Bearer\s+(\S+)$/i);
        const token = standardBearer?.[1] || (
            authorizationHeader.startsWith(bearerKey)
                ? authorizationHeader.slice(bearerKey.length).trim()
                : ""
        );
        if(!token || token.includes(" ")){
            return next(new Error("Please login first", { cause: 401 }));
        }

        if (!process.env.SIGNATURE) {
            return next(new Error("Authentication is not configured", { cause: 500 }));
        }
        const decoded = await jwt.verify(token, process.env.SIGNATURE, { algorithms: ["HS256"] });
        if (await isTokenRevoked(token)) {
            return next(new Error("Token revoked. Please login again", { cause: 401 }));
        }

        const user = await userModel.findOne({ _id: decoded.id, deletedAt: null });
        if(!user){
            return next(new Error("User not found", { cause: 404 }));
        }
        if(!user.confirmEmail){
            return next(new Error("Please verify your email", { cause: 401 }));
        }
        // JWT issue times use whole seconds; reject sessions from before a password change.
        const passwordChangedAt = user.changePasswordTime
            ? Math.floor(new Date(user.changePasswordTime).getTime() / 1000)
            : null;
        if (passwordChangedAt !== null && (typeof decoded.iat !== "number" || decoded.iat < passwordChangedAt)) {
            return next(new Error("Session expired. Please login again", { cause: 401 }));
        }
        if(!accessRoles.includes(user.role)){
            return next(new Error("You are not authorized", { cause: 403 }));
        }
 
        req.user = user;
        req.id = decoded.id;
        req.authToken = token;
        next();




    })

}

// Public catalog routes can accept anonymous visitors while still validating
// an optional token. A supplied but invalid token is rejected rather than
// silently treated as anonymous.
export const optionalAuthorization = () => (req, res, next) => {
    if (!req.headers.authorization) return next();
    return authorization(ROLES_ALL)(req, res, next);
};

export default authorization;
