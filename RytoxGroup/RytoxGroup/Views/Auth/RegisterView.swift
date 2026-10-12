//
//  RegisterView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Registration screen matching RegisterPage.tsx with strict password policy
//

import SwiftUI

public struct RegisterView: View {
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var localError: String?
    
    @ObservedObject private var auth = AuthManager.shared
    @Environment(\.dismiss) private var dismiss
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg.ignoresSafeArea()
                AmbientBackgroundView()
                
                ScrollView {
                    VStack(spacing: 24) {
                        Spacer().frame(height: 10)
                        
                        VStack(spacing: 6) {
                            Text("Tạo Tài Khoản")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.white)
                            Text("Tham gia RytoxGroup để trải nghiệm xem phim đỉnh cao")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.55))
                                .multilineTextAlignment(.center)
                        }
                        
                        VStack(spacing: 16) {
                            // Username
                            VStack(alignment: .leading, spacing: 6) {
                                Text("TÊN NGƯỜI DÙNG")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("nguyenvana", text: $username)
                                        .foregroundColor(.white)
                                        .autocorrectionDisabled()
                                        .textInputAutocapitalization(.never)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Email
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
                                        .textInputAutocapitalization(.never)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Password
                            VStack(alignment: .leading, spacing: 6) {
                                Text("MẬT KHẨU")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    SecureField("Ít nhất 8 ký tự, 1 hoa, 1 số, 1 ký tự đặc biệt", text: $password)
                                        .foregroundColor(.white)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Confirm Password
                            VStack(alignment: .leading, spacing: 6) {
                                Text("XÁC NHẬN MẬT KHẨU")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "lock.shield.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    SecureField("Nhập lại mật khẩu", text: $confirmPassword)
                                        .foregroundColor(.white)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Error display
                            if let err = localError ?? auth.errorMessage {
                                Text(err)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color.appEmber)
                                    .multilineTextAlignment(.center)
                            }
                            
                            // Submit Button
                            Button(action: handleRegister) {
                                HStack {
                                    if auth.isLoading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Đăng Ký")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                        }
                        .padding(24)
                        .liquidGlassCard(cornerRadius: 24)
                        .padding(.horizontal, 20)
                    }
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
    
    private func handleRegister() {
        localError = nil
        
        guard Validators.isValidUsername(username) else {
            localError = "Tên người dùng phải từ 3-30 ký tự, không chứa ký tự đặc biệt."
            HapticFeedback.error()
            return
        }
        
        guard Validators.isValidEmail(email) else {
            localError = "Email không hợp lệ."
            HapticFeedback.error()
            return
        }
        
        guard Validators.isStrongPassword(password) else {
            localError = "Mật khẩu phải tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt."
            HapticFeedback.error()
            return
        }
        
        guard password == confirmPassword else {
            localError = "Mật khẩu xác nhận không khớp."
            HapticFeedback.error()
            return
        }
        
        Task {
            let ok = await auth.register(username: username, email: email, pass: password)
            if ok {
                dismiss()
            }
        }
    }
}
