//
//  LoadingSpinnerView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Initial app connect & loading animation matching AppShell.tsx
//

import SwiftUI

public struct LoadingSpinnerView: View {
    public var message: String = "Đang kết nối..."
    @State private var isSpinning = false
    
    public init(message: String = "Đang kết nối...") {
        self.message = message
    }
    
    public var body: some View {
        VStack(spacing: 24) {
            Text("RytoxGroup")
                .font(.brandLogoLarge)
                .foregroundColor(.white)
                .shadow(color: Color.white.opacity(0.35), radius: 14, x: 0, y: 2)
            
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 3.5)
                    .frame(width: 42, height: 42)
                
                Circle()
                    .trim(from: 0, to: 0.28)
                    .stroke(Color.white, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                    .frame(width: 42, height: 42)
                    .rotationEffect(.degrees(isSpinning ? 360 : 0))
                    .animation(.linear(duration: 0.85).repeatForever(autoreverses: false), value: isSpinning)
            }
            
            Text(message.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(2.5)
                .foregroundColor(.white.opacity(0.40))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appDarkBg)
        .onAppear {
            isSpinning = true
        }
    }
}
