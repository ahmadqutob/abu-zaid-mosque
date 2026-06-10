 

 
 
import multer from "multer"

// handler multer error
export const HME=(err,req,res,next)=>{
    if(err){
        return res.json({message:'multer error' ,err}  )
    }else{
        next()
    }
}

export const fileValidation={
    image:['image/png', 'image/jpg', 'image/jpeg' ],
    file:['application/pdf']
}
function fileUpload  () {

     const storage = multer.diskStorage({
         destination:  (req, res, cb)=>{
            //Where to save files locally
             cb(null,'uploads')
         },
         filename: (req, file, cb)=>{
            //Appends a timestamp to the original filename to make it unique.
        cb(null,Date.now() + file.originalname)   
         }
    })


    function fileFilter(req,file,cb){
        //Check if the file is an image
        const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];

        if(ALLOWED_IMAGE_TYPES.includes(file.mimetype)){
            cb(null,true)
    }else{
        cb('invalid format',false)
    }
}

        const upload= multer({fileFilter,storage});
        return upload
}
export default fileUpload  
   