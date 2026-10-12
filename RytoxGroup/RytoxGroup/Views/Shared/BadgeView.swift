//
//  BadgeView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Quality, language, and episode badge components
//

import SwiftUI

public enum BadgeVariant {
    case quality(String)
    case language(String)
    case episode(String)
    case custom(text: String, color: Color)
}

public struct BadgeView: View {
    public let variant: BadgeVariant
    
    public init(_ variant: BadgeVariant) {
        self.variant = variant
    }
    
    public var body: some View {
        switch variant {
        case .quality(let text):
            Text(text)
                .font(.badgeText)
                .foregroundColor(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 2.5)
                .background(
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(Color.appGold.opacity(0.85))
                )
                .shadow(color: Color.appGold.opacity(0.4), radius: 4, x: 0, y: 1)
            
        case .language(let text):
            Text(text)
                .font(.badgeText)
                .foregroundColor(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 2.5)
                .background(
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(Color.appEmber.opacity(0.85))
                )
                .shadow(color: Color.appEmber.opacity(0.4), radius: 4, x: 0, y: 1)
            
        case .episode(let text):
            Text(text)
                .font(.badgeText)
                .foregroundColor(.white.opacity(0.9))
                .padding(.horizontal, 6)
                .padding(.vertical, 2.5)
                .background(
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(Color.black.opacity(0.65))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
                )
            
        case .custom(let text, let color):
            Text(text)
                .font(.badgeText)
                .foregroundColor(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 2.5)
                .background(
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(color)
                )
        }
    }
}
