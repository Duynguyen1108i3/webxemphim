//
//  LoginView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Authentication login screen matching LoginPage.tsx
//

import SwiftUI

public struct LoginView: View {
    @State private var identity = ""
    @State private var password = ""
    @State private var showRegister = false
    @State private var showForgot = false
    
    @ObservedObject private var auth = AuthManager.shared
    @Environment(\.dismiss) private var dismiss
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg.ignoresSafeArea()
                
                // Ambient glow
                AmbientBackgroundView()
                
                ScrollView {
                    VStack(spacing: 28) {
                        Spacer().frame(height: 20)
                        
                        // Logo
                        VStack(spacing: 8) {
                            Text("RytoxGroup")
                                .font(.brandLogoLarge)
                                .foregroundColor(.white)
                                .shadow(color: Color.white.opacity(0.35), radius: 16, x: 0, y: 2)
                            
                            Text("Đăng nhập để đồng bộ danh sách & lịch sử xem")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        
                        // Form Card
                        VStack(spacing: 18) {
                            // Email/Username Input
                            VStack(alignment: .leading, spacing: 6) {
                                Text("EMAIL HOẶC TÀI KHOẢN")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    TextField("user@domain.com", text: $identity)
                                        .foregroundColor(.white)
                                        .autocorrectionDisabled()
                                        .textInputAutocapitalization(.never)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Password Input
                            VStack(alignment: .leading, spacing: 6) {
                                Text("MẬT KHẨU")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(.white.opacity(0.4))
                                    SecureField("••••••••", text: $password)
                                        .foregroundColor(.white)
                                }
                                .padding(14)
                                .liquidGlassCard(cornerRadius: 12)
                            }
                            
                            // Error Message
                            if let err = auth.errorMessage {
                                Text(err)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color.appEmber)
                                    .multilineTextAlignment(.center)
                            }
                            
                            // Submit Button
                            Button(action: {
                                Task {
                                    let success = await auth.login(identity: identity, pass: password)
                                    if success {
                                        dismiss()
                                    }
                                }
                            }) {
                                HStack {
                                    if auth.isLoading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Đăng Nhập")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                            .disabled(identity.isEmpty || password.isEmpty || auth.isLoading)
                            .opacity(identity.isEmpty || password.isEmpty ? 0.6 : 1.0)
                            
                            // Sub Links
                            HStack {
                                Button("Quên mật khẩu?") {
                                    showForgot = true
                                }
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                                
                                Spacer()
                                
                                Button("Tạo tài khoản") {
                                    showRegister = true
                                }
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color.appEmber)
                            }
                            .padding(.top, 6)
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
            .sheet(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showForgot) {
                ForgotPasswordView()
            }
        }
    }
}
