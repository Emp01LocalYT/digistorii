import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db";

// const SENDER_EMAIL = process.env.LAUNCH_SENDER_EMAIL || "ytsample98@gmail.com";
// const SENDER_PASSWORD = process.env.LAUNCH_SENDER_PASSWORD || "ozjf cupa vukc edsp";

// const transporter = SENDER_EMAIL && SENDER_PASSWORD
//   ? nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: SENDER_EMAIL,
//       pass: SENDER_PASSWORD,
//     },
//   })
//   : null;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


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

    const userCheck = await pool.query(
      `SELECT u.email FROM public.users u
       JOIN public.companies c ON c.id = u.company_id
       WHERE u.email = $1 AND c.subdomain_url = $2`,
      [email, company]
    );

    if (userCheck.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
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
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; overflow: hidden;">
      
      <!-- Header with Solid Fallback -->
      <div style="background-color: #2563eb; background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">${company}</h1>
      </div>

      <!-- Content Area -->
      <div style="padding: 32px 24px; color: #334155;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Password Reset Request</h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #475569;">
          We received a request to reset your password. Click the button below to set up a new password for your account:
        </p>

        <!-- Outlook-Safe CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetLink}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="15%" stroke="f" fillcolor="#2563eb">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">Reset Password</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${resetLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Reset Password
          </a>
          <!--<![endif]-->
        </div>

        <p style="font-size: 13px; line-height: 1.4; color: #64748b; margin: 0 0 16px 0;">
          This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
        </p>

        <!-- Security Fallback Link -->
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px 0;">Having trouble with the button? Copy and paste this link into your browser:</p>
          <p style="font-size: 12px; margin: 0; word-break: break-all;">
            <a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">${resetLink}</a>
          </p>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
      &copy; ${new Date().getFullYear()} ${company}. All rights reserved.
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
