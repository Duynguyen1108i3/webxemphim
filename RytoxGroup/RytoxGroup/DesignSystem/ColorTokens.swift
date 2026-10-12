//
//  ColorTokens.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Brand color definitions and gradient utilities matching webxemphim
//

import SwiftUI

public extension Color {
    // MARK: - Core Palette
    static let appInk = Color(hex: "06070a")
    static let appEmber = Color(hex: "e50914")
    static let appGold = Color(hex: "d8b35a")
    static let appDarkBg = Color(hex: "0e0f14")
    static let appCardDark = Color(hex: "141414")
    
    // MARK: - Surfaces & Gradients
    static let glassRefraction = LinearGradient(
        colors: [
            Color.white.opacity(0.18),
            Color.white.opacity(0.04),
            Color.clear
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let cinemaVignette = LinearGradient(
        stops: [
            .init(color: Color.black.opacity(0.95), location: 0.0),
            .init(color: Color.black.opacity(0.65), location: 0.4),
            .init(color: Color.clear, location: 0.8),
            .init(color: Color.black.opacity(0.85), location: 1.0)
        ],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let heroBottomFade = LinearGradient(
        stops: [
            .init(color: Color.clear, location: 0.0),
            .init(color: Color.appDarkBg.opacity(0.4), location: 0.5),
            .init(color: Color.appDarkBg.opacity(0.95), location: 0.85),
            .init(color: Color.appDarkBg, location: 1.0)
        ],
        startPoint: .top,
        endPoint: .bottom
    )
    
    // MARK: - Hex Initializer
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
