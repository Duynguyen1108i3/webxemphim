//
//  ProfileView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  User profile, multi-profile switcher, and account settings matching ProfilePage.tsx
//

import SwiftUI

public struct ProfileView: View {
    @ObservedObject private var auth = AuthManager.shared
    @State private var selectedTab = 0 // 0: Lịch sử, 1: Yêu thích
    @State private var showLogin = false
    @State private var showSettings = false
    @Environment(\.dismiss) private var dismiss
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg.ignoresSafeArea()
                AmbientBackgroundView()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Banner Card
                        VStack(spacing: 14) {
                            if auth.isAuthenticated, let user = auth.user {
                                // Avatar Circle
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.appEmber, Color(hex: "9333ea")],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 72, height: 72)
                                    
                                    Text(String(user.username.prefix(1)).uppercased())
                                        .font(.system(size: 28, weight: .black))
                                        .foregroundColor(.white)
                                }
                                .overlay(Circle().strokeBorder(Color.white.opacity(0.3), lineWidth: 1.5))
                                
                                VStack(spacing: 4) {
                                    Text(user.username)
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    Text(user.email)
                                        .font(.system(size: 13))
                                        .foregroundColor(.white.opacity(0.6))
                                    
                                    Text("Gói: VIP Streaming (Không Quảng Cáo)")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(Color.appGold)
                                        .padding(.top, 2)
                                }
                                
                                // Profile Switcher (Adult / Kids)
                                if auth.profiles.count > 1 {
                                    HStack(spacing: 12) {
                                        ForEach(auth.profiles) { prof in
                                            Button(action: {
                                                HapticFeedback.selection()
                                                auth.selectedProfile = prof
                                            }) {
                                                Text(prof.name)
                                            }
                                            .buttonStyle(GlassPillButtonStyle(isSelected: auth.selectedProfile?.id == prof.id))
                                        }
                                    }
                                    .padding(.top, 4)
                                }
                            } else {
                                // Guest Mode
                                Image(systemName: "person.crop.circle.badge.plus")
                                    .font(.system(size: 54))
                                    .foregroundColor(.white.opacity(0.5))
                                
                                VStack(spacing: 4) {
                                    Text("Khách (Chưa Đăng Nhập)")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(.white)
                                    Text("Đăng nhập để đồng bộ lịch sử xem trên mọi nền tảng.")
                                        .font(.system(size: 13))
                                        .foregroundColor(.white.opacity(0.55))
                                        .multilineTextAlignment(.center)
                                }
                                
                                Button("Đăng Nhập Ngay") {
                                    showLogin = true
                                }
                                .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                                .padding(.top, 6)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .padding(.horizontal, 20)
                        .liquidGlassCard(cornerRadius: 24)
                        .padding(.horizontal, 18)
                        
                        // Tabs: Watch History vs My List
                        HStack(spacing: 12) {
                            Button(action: {
                                HapticFeedback.selection()
                                selectedTab = 0
                            }) {
                                Text("Lịch Sử Xem")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(GlassPillButtonStyle(isSelected: selectedTab == 0))
                            
                            Button(action: {
                                HapticFeedback.selection()
                                selectedTab = 1
                            }) {
                                Text("Danh Sách Của Tôi")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(GlassPillButtonStyle(isSelected: selectedTab == 1))
                        }
                        .padding(.horizontal, 18)
                        
                        // Content Views
                        VStack {
                            if selectedTab == 0 {
                                WatchHistoryView()
                            } else {
                                MyListView()
                            }
                        }
                        .padding(.horizontal, 18)
                        
                        // Settings & Logout
                        VStack(spacing: 12) {
                            Button(action: {
                                showSettings = true
                            }) {
                                HStack {
                                    Image(systemName: "slider.horizontal.3")
                                    Text("Tùy Chỉnh Kính Lỏng & Hiệu Ứng")
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                }
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white)
                                .padding(16)
                                .liquidGlassCard(cornerRadius: 14)
                            }
                            
                            if auth.isAuthenticated {
                                Button(action: {
                                    auth.logout()
                                }) {
                                    HStack {
                                        Image(systemName: "rectangle.portrait.and.arrow.right")
                                        Text("Đăng Xuất")
                                    }
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color.appEmber)
                                    .frame(maxWidth: .infinity)
                                    .padding(14)
                                    .liquidGlassCard(cornerRadius: 14)
                                }
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 16)
                        .padding(.bottom, 60)
                    }
                }
            }
            .navigationTitle("Tài Khoản")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Đóng") { dismiss() }
                        .foregroundColor(.white)
                }
            }
            .sheet(isPresented: $showLogin) {
                LoginView()
            }
            .sheet(isPresented: $showSettings) {
                GlassSettingsSheet()
            }
        }
    }
}
