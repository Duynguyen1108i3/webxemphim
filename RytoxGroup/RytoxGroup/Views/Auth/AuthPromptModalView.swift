//
//  AuthPromptModalView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Modal prompt prompting guest users to login when saving bookmarks
//

import SwiftUI

public struct AuthPromptModalView: View {
    public var onLogin: () -> Void
    public var onDismiss: () -> Void
    
    public init(onLogin: @escaping () -> Void, onDismiss: @escaping () -> Void) {
        self.onLogin = onLogin
        self.onDismiss = onDismiss
    }
    
    public var body: some View {
        ZStack {
            Color.black.opacity(0.65)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }
            
            VStack(spacing: 20) {
                Image(systemName: "lock.shield")
                    .font(.system(size: 40))
                    .foregroundColor(Color.appEmber)
                
                VStack(spacing: 6) {
                    Text("Yêu Cầu Đăng Nhập")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Đăng nhập tài khoản để lưu danh sách phim yêu thích và đồng bộ tiến độ xem trên mọi thiết bị.")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 10)
                }
                
                HStack(spacing: 12) {
                    Button("Để Sau") {
                        onDismiss()
                    }
                    .buttonStyle(GlassButtonStyle(cornerRadius: 12))
                    
                    Button("Đăng Nhập") {
                        onDismiss()
                        onLogin()
                    }
                    .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                }
            }
            .padding(24)
            .liquidGlassCard(cornerRadius: 24)
            .padding(.horizontal, 32)
        }
    }
}
