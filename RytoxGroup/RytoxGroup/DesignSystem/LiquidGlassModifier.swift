//
//  LiquidGlassModifier.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Faithful implementation of pure Liquid Glass Apple WWDC25 aesthetics from web
//

import SwiftUI

public struct LiquidGlassModifier: ViewModifier {
    @ObservedObject private var theme = ThemeManager.shared
    
    public var cornerRadius: CGFloat
    public var isInteractive: Bool
    public var isPressed: Bool
    public var customBlur: CGFloat?
    public var hasInnerShadow: Bool
    
    public init(
        cornerRadius: CGFloat = 16,
        isInteractive: Bool = false,
        isPressed: Bool = false,
        customBlur: CGFloat? = nil,
        hasInnerShadow: Bool = true
    ) {
        self.cornerRadius = cornerRadius
        self.isInteractive = isInteractive
        self.isPressed = isPressed
        self.customBlur = customBlur
        self.hasInnerShadow = hasInnerShadow
    }
    
    public func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    // Base Glass Blur layer (Hardware accelerated Material)
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    
                    // Dark ambient base tint matching rgba(20, 20, 24, --glass-bg-opacity)
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            Color(red: 20/255, green: 20/255, blue: 24/255)
                                .opacity(isPressed ? theme.glassBgOpacity * 1.3 : theme.glassBgOpacity)
                        )
                    
                    // Diagonal Specular Glare (Glass Refraction layer)
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                stops: [
                                    .init(color: Color.white.opacity(isPressed ? theme.glassSpecularOpacity * 1.5 : theme.glassSpecularOpacity), location: 0.0),
                                    .init(color: Color.white.opacity(0.03), location: 0.45),
                                    .init(color: Color.clear, location: 1.0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    // Highlight top specular line
                    if hasInnerShadow {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .strokeBorder(
                                LinearGradient(
                                    stops: [
                                        .init(color: Color.white.opacity(theme.glassBorderOpacity * 1.3), location: 0.0),
                                        .init(color: Color.white.opacity(theme.glassBorderOpacity * 0.4), location: 0.6),
                                        .init(color: Color.black.opacity(0.35), location: 1.0)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.0
                            )
                    }
                }
            )
            // Multi-layered depth shadow
            .shadow(color: Color.black.opacity(0.45), radius: 16, x: 0, y: 8)
            .shadow(color: Color.black.opacity(0.20), radius: 2, x: 0, y: 1)
            .scaleEffect(isInteractive && isPressed ? 0.96 : 1.0)
            .animation(.interactiveSpring(response: 0.25, dampingFraction: 0.75), value: isPressed)
    }
}

public extension View {
    func liquidGlass(
        cornerRadius: CGFloat = 16,
        isInteractive: Bool = false,
        isPressed: Bool = false,
        customBlur: CGFloat? = nil
    ) -> some View {
        modifier(
            LiquidGlassModifier(
                cornerRadius: cornerRadius,
                isInteractive: isInteractive,
                isPressed: isPressed,
                customBlur: customBlur
            )
        )
    }
    
    func liquidGlassCard(cornerRadius: CGFloat = 16) -> some View {
        modifier(LiquidGlassModifier(cornerRadius: cornerRadius, hasInnerShadow: true))
    }
    
    func liquidGlassPill() -> some View {
        modifier(LiquidGlassModifier(cornerRadius: 9999, hasInnerShadow: true))
    }
}
