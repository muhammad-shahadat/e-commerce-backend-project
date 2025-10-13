require("dotenv").config();
const nodemailer = require("nodemailer");

// Create a transporter for SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

const emailWithNodemailer = async (mailData) =>{
    try {
        const mailOptions = {
            from: process.env.SMTP_USERNAME,
            to: mailData.email,
            subject: mailData.subject,
            html: mailData.html,
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        console.log("Message sent: %s", info.response);

        
    } catch (error) {
        console.error("Error while sending mail", error);
        throw error;

        
    }
}



module.exports = {
    emailWithNodemailer,
}