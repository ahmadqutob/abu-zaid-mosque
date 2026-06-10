import nodemailer from 'nodemailer'

export const sendEmail = async( to , subject , html)=> {
    
    let transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:process.env.email,
            pass:process.env.password
        }

    })
    try{
    let info = await transporter.sendMail({
        from: `${process.env.MOSQUE_NAME || "Abuzaid Mosque"} <${process.env.email}>`,
        to ,
        subject ,
        html ,
      // attachments:attachment if u want to send file (pdf file ) 
    })

    return { success: true, messageId: info.messageId };
}catch(error){
    console.error("Failed to send email:", error);
    return { success: false, error };
}

}
 