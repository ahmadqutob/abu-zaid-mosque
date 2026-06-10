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
            stripUnknown: true});//to remove extra fields not in the schema (helps avoid injection attacks).


 
        
    if (MakeValidation.error?.details) {
        const errors = MakeValidation.error.details.map(err => err.message);
        return res.status(400).json({ message: 'ERRORS', errors });
      }
        return next();

    }
}
export default validation