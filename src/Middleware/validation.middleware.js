import joi from "joi";


const validation = (schema)=>{

    return(req,res,next)=>{
        const inputData = {...req.body , ...req.params , ...req.query }
        if(req.file){
            inputData.file= req.file
        }
        if(req.files){
            if(req.files.mainImage){
                inputData.mainImage = req.files.mainImage
            }
            if(req.files.subImage){
                inputData.subImage = req.files.subImage
            }
        }

        const MakeValidation =schema.validate(inputData , {abortEarly:false ,
            stripUnknown: true});

        if (MakeValidation.error?.details) {
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