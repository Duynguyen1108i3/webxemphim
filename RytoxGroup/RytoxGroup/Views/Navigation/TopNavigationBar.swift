//
//  TopNavigationBar.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct translation of web ShellNavbar.tsx with scroll-aware glass blur
//

import SwiftUI

public struct TopNavigationBar: View {
    public var isScrolled: Bool
    public var onOpenSearch: () -> Void
    public var onOpenSettings: () -> Void
    public var onOpenNotifications: () -> Void
    public var onOpenProfile: () -> Void
    public var hasUnreadNotifications: Bool = false
    
    @ObservedObject private var auth = AuthManager.shared
    
    public init(
        isScrolled: Bool = false,
        onOpenSearch: @escaping () -> Void,
        onOpenSettings: @escaping () -> Void,
        onOpenNotifications: @escaping () -> Void,
        onOpenProfile: @escaping () -> Void,
        hasUnreadNotifications: Bool = false
    ) {
        self.isScrolled = isScrolled
        self.onOpenSearch = onOpenSearch
        self.onOpenSettings = onOpenSettings
        self.onOpenNotifications = onOpenNotifications
        self.onOpenProfile = onOpenProfile
        self.hasUnreadNotifications = hasUnreadNotifications
    }
    
    public var body: some View {
        HStack(spacing: 16) {
            // Brand Logo
            Text("RytoxGroup")
                .font(.brandLogo)
                .foregroundColor(.white)
                .shadow(color: Color.white.opacity(0.35), radius: 10, x: 0, y: 1)
            
            Spacer()
            
            // Action Buttons
            HStack(spacing: 10) {
                // Search Button
                Button(action: {
                    HapticFeedback.light()
                    onOpenSearch()
                }) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .liquidGlassPill()
                }
                
                // Notifications Bell
                Button(action: {
                    HapticFeedback.light()
                    onOpenNotifications()
                }) {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bell.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .liquidGlassPill()
                        
                        if hasUnreadNotifications {
                            Circle()
                                .fill(Color.appEmber)
                                .frame(width: 8, height: 8)
                                .offset(x: -6, y: 6)
                        }
                    }
                }
                
                // Liquid Glass Sliders Setting
                Button(action: {
                    HapticFeedback.light()
                    onOpenSettings()
                }) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .liquidGlassPill()
                }
                
                // Profile Avatar / Login
                Button(action: {
                    HapticFeedback.light()
                    onOpenProfile()
                }) {
                    if auth.isAuthenticated {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.appEmber, Color(hex: "9333ea")],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 32, height: 32)
                            
                            Text(String(auth.user?.username.prefix(1) ?? "U").uppercased())
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .overlay(Circle().strokeBorder(Color.white.opacity(0.3), lineWidth: 1))
                    } else {
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 20, weight: .regular))
                            .foregroundColor(.white.opacity(0.85))
                            .frame(width: 36, height: 36)
                            .liquidGlassPill()
                    }
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(
            ZStack {
                if isScrolled {
                    Color.appDarkBg.opacity(0.75)
                        .background(.ultraThinMaterial)
                        .overlay(
                            Rectangle()
                                .fill(Color.white.opacity(0.10))
                                .frame(height: 0.5),
                            alignment: .bottom
                        )
                } else {
                    LinearGradient(
                        colors: [
                            Color.black.opacity(0.65),
                            Color.black.opacity(0.2),
                            Color.clear
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            }
            .ignoresSafeArea(edges: .top)
        )
        .animation(.easeInOut(duration: 0.25), value: isScrolled)
    }
}
