import { asyncHandler } from "../Services/ErrorHandler.services.js"
import jwt from "jsonwebtoken";
import   userModel from "../../database/Models/user.model.js";

export const role = {
    admin: "admin",
    teacher: "teacher",
    student: "student",
    user: "user",
}

// Convenience groups
export const ROLES_ALL = [role.admin, role.teacher, role.student, role.user];
export const ROLES_STAFF = [role.admin, role.teacher];

const authorization = (accessRoles =[])=>{
    return asyncHandler(async (req ,res , next)=>{

        const {authorization} =req.headers;

        
        
        if(!authorization){
            return next(new Error("Please login first", { cause: 401 }));
        }
        
        const token = authorization.split(process.env.BEARER_KEY)[1];
        if(!token){
            return next(new Error("Please login first", { cause: 401 }));
        }


        
        const decoded = await jwt.verify(token, process.env.SIGNATURE );
        const user = await userModel.findById(decoded.id);
        if(!user){
            return next(new Error("User not found", { cause: 404 }));
        }
        if(!user.confirmEmail){
            return next(new Error("Please verify your email", { cause: 401 }));
        }
        if(!accessRoles.includes(user.role)){
            return next(new Error("You are not authorized", { cause: 403 }));
        }
 
       // if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        
       if (Date.now() >= decoded.exp * 1000) {// compare ms to ms

            return next(new Error('Token expired', { cause: 401 }));
          }
        
        req.user = user;
        req.id = decoded.id;
        next();




    })

}
export default authorization;