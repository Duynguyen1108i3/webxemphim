//
//  GlassButtonStyle.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Custom ButtonStyles matching web .glass-button and .nf-button
//

import SwiftUI

public struct GlassButtonStyle: ButtonStyle {
    @ObservedObject private var theme = ThemeManager.shared
    public var cornerRadius: CGFloat
    
    public init(cornerRadius: CGFloat = 12) {
        self.cornerRadius = cornerRadius
    }
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            configuration.isPressed
                                ? Color.white.opacity(0.20)
                                : Color.white.opacity(0.08)
                        )
                    
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(
                            configuration.isPressed
                                ? Color.white.opacity(0.25)
                                : Color.white.opacity(0.14),
                            lineWidth: 1
                        )
                }
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            )
            .foregroundColor(configuration.isPressed ? .white : Color.white.opacity(0.9))
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .shadow(
                color: configuration.isPressed
                    ? Color.white.opacity(0.15)
                    : Color.black.opacity(0.25),
                radius: configuration.isPressed ? 10 : 4,
                x: 0,
                y: configuration.isPressed ? 2 : 2
            )
            .animation(.interactiveSpring(response: 0.22, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

public struct EmberButtonStyle: ButtonStyle {
    public var cornerRadius: CGFloat
    
    public init(cornerRadius: CGFloat = 12) {
        self.cornerRadius = cornerRadius
    }
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 12)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.appEmber.opacity(configuration.isPressed ? 0.85 : 1.0),
                                    Color(hex: "b80710")
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.25), lineWidth: 1)
                }
            )
            .shadow(color: Color.appEmber.opacity(configuration.isPressed ? 0.4 : 0.6), radius: 14, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.interactiveSpring(response: 0.22, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

public struct GlassPillButtonStyle: ButtonStyle {
    public var isSelected: Bool
    
    public init(isSelected: Bool = false) {
        self.isSelected = isSelected
    }
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: isSelected ? .bold : .medium))
            .foregroundColor(isSelected ? .white : Color.white.opacity(0.75))
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                ZStack {
                    Capsule()
                        .fill(
                            isSelected
                                ? Color.white.opacity(0.22)
                                : (configuration.isPressed ? Color.white.opacity(0.14) : Color.white.opacity(0.06))
                        )
                    
                    Capsule()
                        .strokeBorder(
                            isSelected
                                ? Color.white.opacity(0.35)
                                : Color.white.opacity(0.12),
                            lineWidth: 1
                        )
                }
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.interactiveSpring(response: 0.22, dampingFraction: 0.72), value: configuration.isPressed)
    }
}
