import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

interface DecodedToken {
    email: string;
    company?: string;
    iat: number;
    exp: number;
}

export async function POST(req: Request) {
    let client;

    try {
        const { token, newPassword } = await req.json();

        // 1. Validation checks
        if (!token) {
            return NextResponse.json(
                { success: false, message: "Reset token is missing or invalid" },
                { status: 400 }
            );
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: "Password must be at least 6 characters long" },
                { status: 400 }
            );
        }

        // 2. Verify JWT token
        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "your-secret-key"
            ) as DecodedToken;
        } catch (err: any) {
            if (err.name === "TokenExpiredError") {
                return NextResponse.json(
                    { success: false, message: "Reset link has expired. Please request a new one." },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, message: "Invalid or corrupted reset token." },
                { status: 400 }
            );
        }

        const { email, company } = decoded;

        if (!email) {
            return NextResponse.json(
                { success: false, message: "Invalid token payload" },
                { status: 400 }
            );
        }

        // 3. Connect to PostgreSQL pool
        client = await pool.connect();

        // 4. Check if user exists in this company
        const userResult = await client.query(
            `SELECT u.id, u.email FROM public.users u
             JOIN public.companies c ON c.id = u.company_id
             WHERE u.email = $1 AND c.subdomain_url = $2`,
            [email, company || '']
        );

        if (userResult.rowCount === 0) {
            return NextResponse.json(
                { success: false, message: "User account not found" },
                { status: 404 }
            );
        }

        // 5. Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 6. Update user password in DB
        const userId = userResult.rows[0].id;
        await client.query(
            `UPDATE public.users 
       SET password_hash = $1, created_at = NOW() 
       WHERE id = $2`,
            [hashedPassword, userId]
        );

        return NextResponse.json({
            success: true,
            message: "Password reset successful. You can now log in with your new password.",
        });

    } catch (error: any) {
        console.error("Reset Password API Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Failed to reset password" },
            { status: 500 }
        );
    } finally {
        if (client) {
            client.release();
        }
    }
}