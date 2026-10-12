//
//  AmbientBackgroundView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Hardware-accelerated ambient fluid glow matching AmbientBackground.tsx
//

import SwiftUI

public struct AmbientBackgroundView: View {
    @ObservedObject private var theme = ThemeManager.shared
    
    @State private var animateOrb1 = false
    @State private var animateOrb2 = false
    @State private var animateOrb3 = false
    
    public init() {}
    
    public var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height
            
            ZStack {
                // Pitch black cinema base background
                Color.appDarkBg
                    .ignoresSafeArea()
                
                // Orb 1: Violet / Deep Blue refraction
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(hex: "4f46e5").opacity(0.35 * theme.ambientOpacity),
                                Color(hex: "2563eb").opacity(0.15 * theme.ambientOpacity),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 20,
                            endRadius: w * 0.45
                        )
                    )
                    .frame(width: w * 0.9, height: w * 0.9)
                    .offset(
                        x: animateOrb1 ? -w * 0.2 : w * 0.15,
                        y: animateOrb1 ? -h * 0.25 : -h * 0.15
                    )
                    .blur(radius: 60)
                
                // Orb 2: Deep Crimson / Amber refraction
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.appEmber.opacity(0.28 * theme.ambientOpacity),
                                Color(hex: "9333ea").opacity(0.12 * theme.ambientOpacity),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 20,
                            endRadius: w * 0.5
                        )
                    )
                    .frame(width: w * 1.0, height: w * 1.0)
                    .offset(
                        x: animateOrb2 ? w * 0.25 : -w * 0.1,
                        y: animateOrb2 ? h * 0.1 : h * 0.25
                    )
                    .blur(radius: 70)
                
                // Orb 3: Cyan / Teal cool accent refraction
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(hex: "06b6d4").opacity(0.20 * theme.ambientOpacity),
                                Color(hex: "3b82f6").opacity(0.08 * theme.ambientOpacity),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 20,
                            endRadius: w * 0.4
                        )
                    )
                    .frame(width: w * 0.8, height: w * 0.8)
                    .offset(
                        x: animateOrb3 ? -w * 0.1 : w * 0.2,
                        y: animateOrb3 ? h * 0.35 : h * 0.1
                    )
                    .blur(radius: 65)
                
                // Subtle noise overlay / vignette
                Color.black.opacity(0.25)
                    .ignoresSafeArea()
            }
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 18)
                    .repeatForever(autoreverses: true)
                ) {
                    animateOrb1 = true
                }
                
                withAnimation(
                    .easeInOut(duration: 22)
                    .repeatForever(autoreverses: true)
                ) {
                    animateOrb2 = true
                }
                
                withAnimation(
                    .easeInOut(duration: 26)
                    .repeatForever(autoreverses: true)
                ) {
                    animateOrb3 = true
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}
