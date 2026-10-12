//
//  ShimmerView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Shimmer skeleton loading component
//

import SwiftUI

public struct ShimmerView: View {
    @State private var phase: CGFloat = -1.0
    public var cornerRadius: CGFloat = 12
    
    public init(cornerRadius: CGFloat = 12) {
        self.cornerRadius = cornerRadius
    }
    
    public var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.white.opacity(0.06)
                
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),
                        .init(color: Color.white.opacity(0.12), location: 0.5),
                        .init(color: .clear, location: 1.0)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase * geo.size.width * 2)
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1.0
                }
            }
        }
    }
}
