import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string()
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt"),
  username: z.string()
    .min(3, "Tên tài khoản phải có tối thiểu 3 ký tự")
    .max(32, "Tên tài khoản không được vượt quá 32 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên tài khoản chỉ được phép chứa chữ cái, chữ số và dấu gạch dưới"),
  otp: z.string().length(6, "Mã xác thực phải gồm 6 chữ số")
});

export const loginSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống")
});

export const sendOtpSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ")
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ"),
  code: z.string().length(6, "Mã khôi phục phải gồm 6 chữ số"),
  newPassword: z.string()
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
