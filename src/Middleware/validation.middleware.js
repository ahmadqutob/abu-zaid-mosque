import joi from "joi";
import fs from 'fs';


const validation = (schema)=>{

    return(req,res,next)=>{
        const inputData = {...req.body , ...req.params , ...req.query }
        if(req.file){
            inputData.file= req.file
        }
        if(req.files){
            Object.keys(req.files).forEach(key => {
                inputData[key] = req.files[key];
            });
        }

        const MakeValidation =schema.validate(inputData , {abortEarly:false ,
            stripUnknown: true});

        if (MakeValidation.error?.details) {
            // Clean up uploaded files on validation failure
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            if (req.files) {
                Object.keys(req.files).forEach(key => {
                    const files = req.files[key];
                    if (Array.isArray(files)) {
                        files.forEach(file => {
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                            }
                        });
                    } else if (files && files.path && fs.existsSync(files.path)) {
                        fs.unlinkSync(files.path);
                    }
                });
            }

            const errors = MakeValidation.error.details.map(err => err.message);
            return res.status(400).json({ message: 'ERRORS', errors });
        }
        
        // Update req.body, req.query, req.params with validated values
        if (req.body) {
            for (const key of Object.keys(req.body)) {
                if (MakeValidation.value[key] !== undefined) {
                    req.body[key] = MakeValidation.value[key];
                }
            }
        }
        return next();

    }
}
export default validation