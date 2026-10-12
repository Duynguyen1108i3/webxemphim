//
//  GlassSettingsSheet.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Real-time Liquid Glass Controls Sheet matching web settings menu
//

import SwiftUI

public struct GlassSettingsSheet: View {
    @ObservedObject private var theme = ThemeManager.shared
    @Environment(\.dismiss) private var dismiss
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Live Preview Card
                        VStack(spacing: 12) {
                            Text("Xem Trước Hiệu Ứng")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.6))
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            HStack(spacing: 16) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 28))
                                    .foregroundColor(Color.appGold)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Pure Liquid Glass")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                    Text("Độ trong: \(Int(theme.systemGlassness * 100))% • Mờ: \(Int(theme.glassBlur))px")
                                        .font(.system(size: 12))
                                        .foregroundColor(.white.opacity(0.6))
                                }
                                Spacer()
                            }
                            .padding(18)
                            .liquidGlassCard(cornerRadius: 18)
                        }
                        
                        // Controls Section
                        VStack(spacing: 20) {
                            // Glassness Slider
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text("Độ Kính Lỏng (Glassness)")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white)
                                    Spacer()
                                    Text("\(Int(theme.systemGlassness * 100))%")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                
                                Slider(
                                    value: $theme.systemGlassness,
                                    in: 0.10...1.0,
                                    step: 0.05
                                )
                                .tint(Color.appEmber)
                            }
                            
                            Divider().background(Color.white.opacity(0.1))
                            
                            // Ambient Opacity Slider
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text("Độ Sáng Không Gian (Ambient)")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white)
                                    Spacer()
                                    Text("\(Int(theme.ambientOpacity * 100))%")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                
                                Slider(
                                    value: $theme.ambientOpacity,
                                    in: 0.0...1.0,
                                    step: 0.05
                                )
                                .tint(Color(hex: "4f46e5"))
                            }
                        }
                        .padding(20)
                        .liquidGlassCard(cornerRadius: 18)
                        
                        // Reset Button
                        Button(action: {
                            HapticFeedback.light()
                            theme.resetToDefaults()
                        }) {
                            HStack {
                                Image(systemName: "arrow.counterclockwise")
                                Text("Khôi Phục Mặc Định")
                            }
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.75))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .liquidGlassCard(cornerRadius: 12)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Tùy Chỉnh Kính Lỏng")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Xong") {
                        dismiss()
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color.appEmber)
                }
            }
        }
    }
}
