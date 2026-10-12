//
//  GlassCard.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Reusable container styled with pure Liquid Glass
//

import SwiftUI

public struct GlassCard<Content: View>: View {
    public var cornerRadius: CGFloat
    public var content: () -> Content
    
    public init(cornerRadius: CGFloat = 16, @ViewBuilder content: @escaping () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content
    }
    
    public var body: some View {
        content()
            .liquidGlassCard(cornerRadius: cornerRadius)
    }
}
