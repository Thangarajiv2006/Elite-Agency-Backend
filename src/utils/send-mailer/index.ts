import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import ejs from "ejs";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const renderTemplate = (templateName: string, data: any): Promise<string> => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "utils",
    "emailTemplates",
    `${templateName}.ejs`,
  );
  return ejs.renderFile(templatePath, data);
};

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: any,
): Promise<boolean> => {
  try {
    const htmlContent = await renderTemplate(templateName, data);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
