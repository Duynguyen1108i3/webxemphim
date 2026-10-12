//
//  ForgotPasswordView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Forgot password screen matching ForgotPasswordPage.tsx
//

import SwiftUI

public struct ForgotPasswordView: View {
    @State private var email = ""
    @State private var isSubmitted = false
    @Environment(\.dismiss) private var dismiss
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg.ignoresSafeArea()
                AmbientBackgroundView()
                
                VStack(spacing: 24) {
                    Spacer().frame(height: 20)
                    
                    VStack(spacing: 8) {
                        Text("Quên Mật Khẩu")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(.white)
                        Text("Nhập email để nhận hướng dẫn khôi phục tài khoản")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.55))
                            .multilineTextAlignment(.center)
                    }
                    
                    VStack(spacing: 18) {
                        if isSubmitted {
                            VStack(spacing: 14) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 48))
                                    .foregroundColor(Color(hex: "22c55e"))
                                
                                Text("Đã gửi mã xác nhận!")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                
                                Text("Vui lòng kiểm tra hộp thư \(email) để đặt lại mật khẩu mới.")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.7))
                                    .multilineTextAlignment(.center)
                                
                                Button("Hoàn Tất") {
                                    dismiss()
                                }
                                .buttonStyle(GlassButtonStyle(cornerRadius: 12))
                                .padding(.top, 10)
                            }
                            .padding(.vertical, 16)
                        } else {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("EMAIL")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("user@domain.com", text: $email)
                                        .foregroundColor(.white)
                                        .keyboardType(.emailAddress)
                                        .autocorrectionDisabled()
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            Button(action: {
                                HapticFeedback.success()
                                withAnimation {
                                    isSubmitted = true
                                }
                            }) {
                                Text("Gửi Mã Khôi Phục")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                            .disabled(!Validators.isValidEmail(email))
                            .opacity(Validators.isValidEmail(email) ? 1.0 : 0.6)
                        }
                    }
                    .padding(24)
                    .liquidGlassCard(cornerRadius: 24)
                    .padding(.horizontal, 20)
                    
                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Đóng") { dismiss() }
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
    }
}
