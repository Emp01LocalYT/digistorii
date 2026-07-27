import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const SENDER_EMAIL = process.env.LAUNCH_SENDER_EMAIL || "ytsample98@gmail.com";
const SENDER_PASSWORD = process.env.LAUNCH_SENDER_PASSWORD || "ozjf cupa vukc edsp";

const transporter = SENDER_EMAIL && SENDER_PASSWORD
  ? nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SENDER_EMAIL,
      pass: SENDER_PASSWORD,
    },
  })
  : null;

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT),
//   secure: process.env.SMTP_SECURE === "true",
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });


export async function POST(req: NextRequest) {
  try {
    const company = req.nextUrl.searchParams.get("company")?.trim() || "digistorii";
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const resetToken = jwt.sign(
      { email, company },
      process.env.JWT_SECRET || "dev-secret-key",
      { expiresIn: "15m" }
    );

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const resetLink = `${origin}/${encodeURIComponent(company)}/workspace/reset-password?token=${resetToken}`;

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="background: linear-gradient(to right, #2563eb, #4f46e5); padding: 15px; border-radius: 8px; text-align: center; color: white;">
          <h2>${company}</h2>
        </div>
        <div style="padding: 20px; color: #333333;">
          <h3>Password Reset Request</h3>
          <p>We received a request to reset your password. Click the button below to set up a new password for your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #777777;">This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
        <div style="text-align: center; font-size: 11px; color: #aaa; margin-top: 20px;">
          © ${new Date().getFullYear()} ${company}. All rights reserved.
        </div>
      </div>
    `;

    if (transporter) {
      await transporter.sendMail({
        from: `"DigiStorii Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Reset Your Password - ${company}`,
        html: htmlTemplate,
      });
    } else {
      console.warn("SMTP credentials are not configured; skipping email send for forgot-password.");
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link sent to your email address. ",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send reset email." },
      { status: 500 }
    );
  }
}
