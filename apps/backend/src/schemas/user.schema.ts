import { z } from "zod";

export const updateAvatarSchema = z.object({
  avatarUrl: z.string()
});

export const updateUsernameSchema = z.object({
  username: z.string()
    .min(3, "Tên người dùng phải có tối thiểu 3 ký tự")
    .max(32, "Tên người dùng không được vượt quá 32 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên người dùng chỉ chứa chữ cái, chữ số và dấu gạch dưới")
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string()
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
});

export const sendEmailOtpSchema = z.object({
  newEmail: z.string().email("Địa chỉ email không hợp lệ")
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email("Địa chỉ email không hợp lệ"),
  otp: z.string().length(6, "Mã xác thực OTP phải gồm 6 chữ số")
});

export const favoriteSchema = z.object({
  movieId: z.string().min(1)
});

export const watchHistorySchema = z.object({
  movieId: z.string().min(1),
  episodeId: z.string().optional(),
  progressSeconds: z.number().min(0).default(0),
  completed: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

export const profileSchema = z.object({
  name: z.string().min(1, "Tên hồ sơ không được để trống").max(32, "Tên hồ sơ tối đa 32 ký tự"),
  type: z.enum(["ADULT", "KIDS"]).default("ADULT")
});
